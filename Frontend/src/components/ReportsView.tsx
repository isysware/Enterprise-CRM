import React, { useState, useMemo, useCallback } from 'react';
import { useCRM } from '../context/CRMContext';
import { formatPKR, parseAmount, getClientRevenue } from '../utils/formatters';
import { ReportId, ReportFilterState, DatePreset } from './reports/types';
import { ReportHeader } from './reports/ReportHeader';
import { ReportFilterBar } from './reports/ReportFilterBar';
import { SalesPipelineReport } from './reports/SalesPipelineReport';
import { TeamStaffReport } from './reports/TeamStaffReport';
import { FollowUpsActivityReport } from './reports/FollowUpsActivityReport';
import { ClientsConversionsReport } from './reports/ClientsConversionsReport';
import { SourceServiceReport } from './reports/SourceServiceReport';
import { CommercialRevenueReport } from './reports/CommercialRevenueReport';
import { exportToCSV } from './reports/csvExportHelper';
import { exportToExcel } from './reports/excelExportHelper';
import { PrintableReportHeader } from './reports/PrintableReportHeader';

interface ReportsViewProps {
  activeReportId?: ReportId;
  onChangeReport?: (id: ReportId) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  activeReportId,
  onChangeReport
}) => {
  const {
    scopedLeads,
    scopedFollowUps,
    scopedClients,
    scopedUsers,
    scopedTeams,
    services,
    sources,
    pricingModels,
    currentUser
  } = useCRM();

  // Active Report Navigation state (controlled if prop provided, else fallback to internal)
  const [internalActiveReport, setInternalActiveReport] = useState<ReportId>('sales-pipeline');
  const activeReport = activeReportId || internalActiveReport;
  const setActiveReport = useCallback((id: ReportId) => {
    if (onChangeReport) {
      onChangeReport(id);
    } else {
      setInternalActiveReport(id);
    }
  }, [onChangeReport]);

  // Initial reference dates
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  // Global Filter State
  const [filterState, setFilterState] = useState<ReportFilterState>({
    datePreset: 'last_30_days',
    fromDate: thirtyDaysAgoStr,
    toDate: todayStr,
    teamId: 'All',
    userId: 'All',
    source: 'All',
    service: 'All',
    status: 'All'
  });

  const handleUpdateFilter = useCallback((updates: Partial<ReportFilterState>) => {
    setFilterState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilterState({
      datePreset: 'last_30_days',
      fromDate: thirtyDaysAgoStr,
      toDate: todayStr,
      teamId: 'All',
      userId: 'All',
      source: 'All',
      service: 'All',
      status: 'All'
    });
  }, [thirtyDaysAgoStr, todayStr]);

  // Available users scoped by selected team
  const availableUsers = useMemo(() => {
    if (filterState.teamId === 'All') return scopedUsers;
    return scopedUsers.filter(u => u.teamId === filterState.teamId);
  }, [scopedUsers, filterState.teamId]);

  // Date filtering helper
  const isDateWithinRange = useCallback((dateString?: string | null): boolean => {
    if (!filterState.fromDate && !filterState.toDate) return true;
    if (!dateString) return true;
    const d = dateString.substring(0, 10);
    if (filterState.fromDate && d < filterState.fromDate) return false;
    if (filterState.toDate && d > filterState.toDate) return false;
    return true;
  }, [filterState.fromDate, filterState.toDate]);

  // 1. FILTERED LEADS (Strictly from authorized scopedLeads)
  const filteredLeads = useMemo(() => {
    return scopedLeads.filter(l => {
      // Team filter
      if (filterState.teamId !== 'All' && l.teamId !== filterState.teamId) {
        return false;
      }
      // User / Rep filter
      if (filterState.userId !== 'All' && l.assignedToId !== filterState.userId) {
        return false;
      }
      // Source filter
      if (filterState.source !== 'All' && l.source !== filterState.source) {
        return false;
      }
      // Service filter
      if (filterState.service !== 'All' && !(l.services || []).includes(filterState.service)) {
        return false;
      }
      // Status filter
      if (filterState.status !== 'All' && l.status !== filterState.status) {
        return false;
      }
      // Date range check
      const dateToCheck = l.createdAt || l.updatedAt || l.firstContactDate;
      return isDateWithinRange(dateToCheck);
    });
  }, [scopedLeads, filterState, isDateWithinRange]);

  // 2. FILTERED FOLLOW-UPS (Strictly from authorized scopedFollowUps)
  const filteredFollowUps = useMemo(() => {
    return scopedFollowUps.filter(f => {
      // User filter
      if (filterState.userId !== 'All' && f.assignedToId !== filterState.userId) {
        return false;
      }
      // Team filter (if assigned to a user in selected team)
      if (filterState.teamId !== 'All') {
        const rep = scopedUsers.find(u => u.id === f.assignedToId);
        if (rep && rep.teamId !== filterState.teamId) return false;
      }
      // Status filter
      if (filterState.status !== 'All') {
        if (filterState.status === 'Converted' || filterState.status === 'Lost') {
          // not directly applicable to follow-ups
        } else if (f.status !== filterState.status) {
          return false;
        }
      }
      // Date range check
      const dateToCheck = f.scheduledDate || f.createdAt;
      return isDateWithinRange(dateToCheck);
    });
  }, [scopedFollowUps, scopedUsers, filterState, isDateWithinRange]);

  // 3. FILTERED CLIENTS (Strictly from authorized scopedClients)
  const filteredClients = useMemo(() => {
    return scopedClients.filter(c => {
      // User filter
      if (filterState.userId !== 'All') {
        const isMatch = c.assignedToId === filterState.userId ||
          c.generatedById === filterState.userId ||
          c.closedById === filterState.userId;
        if (!isMatch) return false;
      }
      // Source filter
      if (filterState.source !== 'All' && c.source !== filterState.source) {
        return false;
      }
      // Date range check
      const dateToCheck = c.convertedDate || c.startDate || c.createdAt;
      return isDateWithinRange(dateToCheck);
    });
  }, [scopedClients, filterState, isDateWithinRange]);

  // Available unique sources & services
  const availableSources = useMemo(() => {
    const list = Array.from(new Set([...sources, ...scopedLeads.map(l => l.source).filter(Boolean)]));
    return list;
  }, [sources, scopedLeads]);

  const availableServices = useMemo(() => {
    const list = Array.from(new Set([
      ...services.map(s => s.name),
      ...scopedLeads.flatMap(l => l.services || []).filter(Boolean)
    ]));
    return list;
  }, [services, scopedLeads]);

  // Active filter summary pills for Header
  const filterSummary = useMemo(() => {
    const pills: string[] = [];
    if (filterState.datePreset === 'all_time') {
      pills.push('All Time');
    } else if (filterState.datePreset === 'today') {
      pills.push(`Today (${todayStr})`);
    } else if (filterState.datePreset === 'this_month') {
      pills.push('This Month');
    } else if (filterState.datePreset === 'last_30_days') {
      pills.push('Last 30 Days');
    } else if (filterState.datePreset === 'custom' && (filterState.fromDate || filterState.toDate)) {
      pills.push(`${filterState.fromDate || 'Start'} to ${filterState.toDate || 'Present'}`);
    }

    if (filterState.teamId !== 'All') {
      const tm = scopedTeams.find(t => t.id === filterState.teamId);
      if (tm) pills.push(`Team: ${tm.name}`);
    }

    if (filterState.userId !== 'All') {
      const u = scopedUsers.find(user => user.id === filterState.userId);
      if (u) pills.push(`Rep: ${u.name}`);
    }

    if (filterState.source !== 'All') pills.push(`Source: ${filterState.source}`);
    if (filterState.service !== 'All') pills.push(`Service: ${filterState.service}`);
    if (filterState.status !== 'All') pills.push(`Status: ${filterState.status}`);

    return pills;
  }, [filterState, scopedTeams, scopedUsers, todayStr]);

  // Report Meta configurations
  const reportMeta = useMemo(() => {
    switch (activeReport) {
      case 'sales-pipeline':
        return {
          title: 'Sales & Pipeline Performance',
          description: 'Comprehensive analysis of pipeline velocity, stage progression, conversion yields, and deal valuations.',
          recordCount: filteredLeads.length
        };
      case 'team-staff': {
        const filteredCount = scopedUsers.filter(u => {
          if (filterState.teamId !== 'All' && u.teamId !== filterState.teamId) return false;
          if (filterState.userId !== 'All' && u.id !== filterState.userId) return false;
          return true;
        }).length;
        return {
          title: 'Team & Staff Performance',
          description: 'Sales representative accountability, conversion ratios, pipeline load, and follow-up discipline.',
          recordCount: filteredCount
        };
      }
      case 'followups-activity':
        return {
          title: 'Follow-Ups & Interaction Activity',
          description: 'Scheduled touchpoints, overdue alerts, channel breakdown, and agent completion metrics.',
          recordCount: filteredFollowUps.length
        };
      case 'clients-conversions':
        return {
          title: 'Clients & Conversions Ledger',
          description: 'Closed customer acquisitions, origin channels, contract revenues, and active subscription retainers.',
          recordCount: filteredClients.length
        };
      case 'source-service':
        return {
          title: 'Source & Service Performance',
          description: 'Marketing channel effectiveness (Meta Ads, WhatsApp, Inbound) and service solution demand.',
          recordCount: availableSources.length
        };
      case 'commercial-revenue':
        return {
          title: 'Commercial & Revenue Analytics',
          description: 'Active contract revenues, SaaS retainers, turnkey projects, and pricing model yield.',
          recordCount: filteredClients.length
        };
    }
  }, [activeReport, filteredLeads.length, scopedUsers.length, filteredFollowUps.length, filteredClients.length, availableSources.length]);

  // Formatted Date Range label for export metadata and printable header
  const dateRangeLabel = useMemo(() => {
    if (filterState.datePreset === 'all_time') return 'All Time';
    if (filterState.datePreset === 'today') return `Today (${todayStr})`;
    if (filterState.datePreset === 'this_month') return 'This Month';
    if (filterState.datePreset === 'last_30_days') return 'Last 30 Days';
    if (filterState.datePreset === 'custom') {
      return `${filterState.fromDate || 'Start'} to ${filterState.toDate || 'Present'}`;
    }
    return 'Custom Interval';
  }, [filterState.datePreset, filterState.fromDate, filterState.toDate, todayStr]);

  // Standardized export payload generator for both Excel and CSV
  const getActiveReportData = useCallback((): { headers: string[]; rows: (string | number)[][]; baseName: string } => {
    switch (activeReport) {
      case 'sales-pipeline': {
        const headers = ['Lead / Business', 'Contact Name', 'Phone', 'Email', 'Service', 'Source', 'Status', 'Priority', 'Assigned Rep', 'Team', 'Value PKR', 'Created Date'];
        const rows = filteredLeads.map(l => [
          l.businessName || l.name,
          l.name,
          l.phone,
          l.email || '',
          (l.services || []).join('; '),
          l.source || 'Direct',
          l.status,
          l.priority || 'Medium',
          l.assignedToName || '',
          l.teamName || '',
          parseAmount(l.value),
          l.createdAt ? l.createdAt.substring(0, 10) : ''
        ]);
        return { headers, rows, baseName: 'iSysware_Sales_Pipeline' };
      }
      case 'team-staff': {
        const headers = ['Representative', 'Email', 'Role', 'Team', 'Assigned Leads', 'Converted', 'Conversion Rate %', 'Pipeline Value PKR'];
        const usersForExport = scopedUsers.filter(u => {
          if (filterState.teamId !== 'All' && u.teamId !== filterState.teamId) return false;
          if (filterState.userId !== 'All' && u.id !== filterState.userId) return false;
          return true;
        });
        const rows = usersForExport.map(u => {
          const uLeads = filteredLeads.filter(l => l.assignedToId === u.id);
          const uWon = uLeads.filter(l => ['Converted', 'Won'].includes(l.status)).length;
          const uVal = uLeads.reduce((s, l) => s + parseAmount(l.value), 0);
          const rate = uLeads.length > 0 ? Math.round((uWon / uLeads.length) * 100) : 0;
          return [u.name, u.email, u.role, u.teamName || '', uLeads.length, uWon, rate, uVal];
        });
        return { headers, rows, baseName: 'iSysware_Team_Performance' };
      }
      case 'followups-activity': {
        const headers = ['Client / Lead', 'Contact Phone', 'Interaction Type', 'Scheduled Date', 'Scheduled Time', 'Assigned Rep', 'Status', 'Notes'];
        const rows = filteredFollowUps.map(f => [
          f.clientName,
          f.phone,
          f.type,
          f.scheduledDate,
          f.scheduledTime || '',
          f.assignedToName || '',
          f.status,
          f.notes || ''
        ]);
        return { headers, rows, baseName: 'iSysware_FollowUps_Activity' };
      }
      case 'clients-conversions': {
        const headers = ['Client / Business', 'Contact Name', 'Phone', 'Email', 'Services', 'Origin Source', 'Pricing Model', 'Contract Value PKR', 'Converted Date', 'Assigned Rep', 'Status'];
        const rows = filteredClients.map(c => [
          c.businessName || c.clientName,
          c.clientName,
          c.phone,
          c.email || '',
          (c.services || []).join('; '),
          c.source || 'Direct',
          c.pricingModel || 'SaaS',
          getClientRevenue(c),
          c.convertedDate || c.startDate || '',
          c.assignedToName || '',
          c.status || 'Active'
        ]);
        return { headers, rows, baseName: 'iSysware_Clients_Conversions' };
      }
      case 'source-service': {
        const headers = ['Channel / Source', 'Total Leads', 'Converted Deals', 'Conversion Rate %', 'Generated Pipeline Value PKR'];
        const rows = availableSources.map(src => {
          const matched = filteredLeads.filter(l => l.source === src);
          const won = matched.filter(l => ['Converted', 'Won'].includes(l.status)).length;
          const val = matched.reduce((s, l) => s + parseAmount(l.value), 0);
          const rate = matched.length > 0 ? Math.round((won / matched.length) * 100) : 0;
          return [src, matched.length, won, rate, val];
        });
        return { headers, rows, baseName: 'iSysware_Source_Service' };
      }
      case 'commercial-revenue': {
        const headers = ['Client / Account', 'Pricing Model', 'Active Revenue PKR', 'Contract Date', 'Assigned Rep'];
        const rows = filteredClients.map(c => [
          c.businessName || c.clientName,
          c.pricingModel || 'Custom',
          getClientRevenue(c),
          c.convertedDate || c.startDate || '',
          c.assignedToName || ''
        ]);
        return { headers, rows, baseName: 'iSysware_Commercial_Revenue' };
      }
    }
  }, [activeReport, filteredLeads, scopedUsers, filteredFollowUps, filteredClients, availableSources]);

  // Real Native Excel (.xlsx) Exporter with SheetJS
  const handleExportExcel = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const { headers, rows, baseName } = getActiveReportData();
    exportToExcel({
      fileName: `${baseName}_${timestamp}`,
      reportTitle: reportMeta.title,
      scope: currentUser?.role ? `${currentUser.role} Authority` : 'CRM Authorized Scope',
      dateRange: dateRangeLabel,
      generatedBy: `${currentUser?.name || 'CRM User'} (${currentUser?.email || ''})`,
      filterSummary,
      headers,
      rows
    });
  };

  // CSV Fallback Exporter
  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const { headers, rows, baseName } = getActiveReportData();
    exportToCSV(`${baseName}_${timestamp}`, headers, rows);
  };

  // Print & PDF Handlers
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="pb-16 max-w-[1600px] mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* Formal Printable Document Header — displayed only when printing / saving as PDF */}
      <PrintableReportHeader
        reportTitle={reportMeta.title}
        userRole={currentUser?.role}
        userName={currentUser?.name}
        userEmail={currentUser?.email}
        dateRange={dateRangeLabel}
        filterSummary={filterSummary}
        recordCount={reportMeta.recordCount}
      />

      {/* Main Single-Hierarchy Report Content Container — Driven by Main CRM Sidebar */}
      <div className="w-full space-y-4 print:w-full">
        {/* Report Header with [ Excel ] [ PDF ] [ Print ] controls — hidden on print */}
        <div className="no-print">
          <ReportHeader
            title={reportMeta.title}
            description={reportMeta.description}
            userRole={currentUser?.role}
            filterSummary={filterSummary}
            recordCount={reportMeta.recordCount}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            onPrint={handlePrint}
            onExportCSV={handleExportCSV}
          />
        </div>

        {/* Active Consolidated Report Content Section (Cards are on TOP, Filters are inside each report BELOW cards) */}
        <main aria-label={reportMeta.title} className="print:p-0">
          {activeReport === 'sales-pipeline' && (
            <SalesPipelineReport
              leads={filteredLeads}
              filterBar={
                <ReportFilterBar
                  activeReport={activeReport}
                  currentUserRole={currentUser?.role}
                  filterState={filterState}
                  onChangeFilter={handleUpdateFilter}
                  onResetFilters={handleResetFilters}
                  availableTeams={scopedTeams}
                  availableUsers={availableUsers}
                  availableSources={availableSources}
                  availableServices={availableServices}
                />
              }
            />
          )}

          {activeReport === 'team-staff' && (
            <TeamStaffReport
              currentUser={currentUser}
              scopedUsers={availableUsers}
              scopedTeams={scopedTeams}
              scopedLeads={filteredLeads}
              scopedFollowUps={filteredFollowUps}
              selectedTeamId={filterState.teamId}
              selectedUserId={filterState.userId}
              filterBar={
                <ReportFilterBar
                  activeReport={activeReport}
                  currentUserRole={currentUser?.role}
                  filterState={filterState}
                  onChangeFilter={handleUpdateFilter}
                  onResetFilters={handleResetFilters}
                  availableTeams={scopedTeams}
                  availableUsers={availableUsers}
                  availableSources={availableSources}
                  availableServices={availableServices}
                />
              }
            />
          )}

          {activeReport === 'followups-activity' && (
            <FollowUpsActivityReport
              followUps={filteredFollowUps}
              leads={filteredLeads}
              filterBar={
                <ReportFilterBar
                  activeReport={activeReport}
                  currentUserRole={currentUser?.role}
                  filterState={filterState}
                  onChangeFilter={handleUpdateFilter}
                  onResetFilters={handleResetFilters}
                  availableTeams={scopedTeams}
                  availableUsers={availableUsers}
                  availableSources={availableSources}
                  availableServices={availableServices}
                />
              }
            />
          )}

          {activeReport === 'clients-conversions' && (
            <ClientsConversionsReport
              clients={filteredClients}
              filterBar={
                <ReportFilterBar
                  activeReport={activeReport}
                  currentUserRole={currentUser?.role}
                  filterState={filterState}
                  onChangeFilter={handleUpdateFilter}
                  onResetFilters={handleResetFilters}
                  availableTeams={scopedTeams}
                  availableUsers={availableUsers}
                  availableSources={availableSources}
                  availableServices={availableServices}
                />
              }
            />
          )}

          {activeReport === 'source-service' && (
            <SourceServiceReport
              leads={filteredLeads}
              clients={filteredClients}
              sources={availableSources}
              services={services}
              filterBar={
                <ReportFilterBar
                  activeReport={activeReport}
                  currentUserRole={currentUser?.role}
                  filterState={filterState}
                  onChangeFilter={handleUpdateFilter}
                  onResetFilters={handleResetFilters}
                  availableTeams={scopedTeams}
                  availableUsers={availableUsers}
                  availableSources={availableSources}
                  availableServices={availableServices}
                />
              }
            />
          )}

          {activeReport === 'commercial-revenue' && (
            <CommercialRevenueReport
              clients={filteredClients}
              leads={filteredLeads}
              pricingModels={pricingModels}
              filterBar={
                <ReportFilterBar
                  activeReport={activeReport}
                  currentUserRole={currentUser?.role}
                  filterState={filterState}
                  onChangeFilter={handleUpdateFilter}
                  onResetFilters={handleResetFilters}
                  availableTeams={scopedTeams}
                  availableUsers={availableUsers}
                  availableSources={availableSources}
                  availableServices={availableServices}
                />
              }
            />
          )}
        </main>
      </div>
    </div>
  );
};
