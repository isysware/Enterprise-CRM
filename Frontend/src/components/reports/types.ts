export type ReportId =
  | 'sales-pipeline'
  | 'team-staff'
  | 'followups-activity'
  | 'clients-conversions'
  | 'source-service'
  | 'commercial-revenue';

export type DatePreset = 'today' | 'this_month' | 'last_30_days' | 'all_time' | 'custom';

export interface ReportFilterState {
  datePreset: DatePreset;
  fromDate: string;
  toDate: string;
  teamId: string;
  userId: string;
  source: string;
  service: string;
  status: string;
}

export interface ReportDefinition {
  id: ReportId;
  label: string;
  shortLabel: string;
  description: string;
  iconName: string;
  category: string;
}
