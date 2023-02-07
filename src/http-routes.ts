import { Application, Request, Response } from "express";
import DeviceManager from "./DeviceManager";
import UIBuilder from "./UIBuilder";
import logger from "./logger";

export default function router(app: Application, asyncMiddleware: CallableFunction) {
    
    app.get('/', asyncMiddleware(async (_: Request, res: Response) => {
        const devices = DeviceManager.inst.all();
        
        const uiBuilder = new UIBuilder({
            viewsPath: `${app.get('views')}`,
            partialsPrefix: 'device-control-partials'
        })
        const deviceViews = await uiBuilder.build(devices);

        return res.render('index', {
            deviceViews
        });
    }));
    
    app.get('/status', asyncMiddleware(async (_: Request, res: Response) => {
        const updatesStatus = {...DeviceManager.inst.getPendingUpdates()}
        
        for (const key in updatesStatus) {
            const item = updatesStatus[key];
            const status = item.updateStatus;
            if (status === 'completed') {
                DeviceManager.inst.clearPendingUpdate(key);
            }
        }
        
        return res.json({
            status: true,
            result: updatesStatus
        })
    }));
    
    app.get('/refresh', asyncMiddleware(async (req: Request, res: Response) => {
        const did = req.query.did || null;
        const fid = req.query.fid || null;
        
        if (!did || !fid) {
            return res.json({
                status: false,
                error: 'Missing did || fid parameters'
            });
        }
        
        try {
            const state = DeviceManager.inst.getState(did, fid);

            const uiBuilder = new UIBuilder({
                viewsPath: `${app.get('views')}`,
                partialsPrefix: 'device-control-partials'
            })
            
            const view = await uiBuilder.renderView({
                ...state,
                did,
            });
            return res.json({
                status: true,
                content: view
            });
        } catch (e: any) {
            logger.error(e);
            return res.json({
                status: false,
                error: e.message
            });
        }
        
    }))
    
    app.post('/device/update', asyncMiddleware(async (req: Request, res: Response) => {
        const did = req.query.did || null;
        const fid = req.query.fid || null;
        
        if (!did || !fid) {
            return res.json({
                status: false,
                error: 'Missing did || fid parameters'
            });
        }
        
        const data = req.body.data;
            
        try {
            await DeviceManager.inst.updateFeatureState(did, fid, data);
            return res.json({
                status: true
            })
        } catch (e) {
            logger.error(e);
            logger.info('Device or feature not found', req.query);
            return res.json({
                status: false,
                error: "Device or feature not found"
            });
        }
    }));
    
    app.post('/request-update', asyncMiddleware(async (req: Request, res: Response) => {
        const body = req.body;
        const result = await DeviceManager.inst.requestStateUpdate(body);
        res.json({
            status: true,
            result
        });
    }));
}