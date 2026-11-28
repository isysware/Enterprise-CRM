import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { ServicesService } from './services.service';
import { CreateServiceInput, UpdateServiceInput } from './services.validator';

export class ServicesController {
  public static async listServices(req: AuthenticatedRequest, res: Response): Promise<void> {
    const activeOnly = req.query.activeOnly === 'true';
    const services = await ServicesService.listServices(activeOnly);
    sendSuccess(res, services, 'Services retrieved successfully', 200);
  }

  public static async getServiceById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const service = await ServicesService.getServiceById(req.params.id as string);
    sendSuccess(res, service, 'Service retrieved successfully', 200);
  }

  public static async createService(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as CreateServiceInput;
    const service = await ServicesService.createService(req.user, input);
    sendSuccess(res, service, 'Service created successfully', 201);
  }

  public static async updateService(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as UpdateServiceInput;
    const service = await ServicesService.updateService(req.user, req.params.id as string, input);
    sendSuccess(res, service, 'Service updated successfully', 200);
  }

  public static async deleteService(req: AuthenticatedRequest, res: Response): Promise<void> {
    await ServicesService.deleteService(req.user, req.params.id as string);
    sendSuccess(res, null, 'Service deleted successfully', 200);
  }
}
