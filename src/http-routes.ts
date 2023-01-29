import { Application, Request, Response } from "express";
import DeviceManager from "./DeviceManager";
import UIBuilder from "./UIBuilder";

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
            const status = updatesStatus[key];
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
            console.error(e);
            return res.json({
                status: false,
                error: e.message
            });
        }
        
    }))
    
    app.all('/device/update', asyncMiddleware(async (req: Request, res: Response) => {
        const did = req.query.did || null;
        const fid = req.query.fid || null;
        
        if (!did || !fid) {
            return res.json({
                status: false,
                error: 'Missing did || fid parameters'
            });
        }
        
        const method = req.method.toLowerCase();
        if (method === 'get') {
            try {
                const value = await DeviceManager.inst.getPendingUpdate(did, fid);
                return res.json({
                    status: true,
                    value
                })
            } catch (e) {
                console.error(e);
                console.log('Device or feature not found', req.query);
                return res.json({
                    status: false,
                    error: "Device or feature not found"
                });
            }
        } else if (method === 'post') {
            const data = req.body.data;
            
            try {
                await DeviceManager.inst.updateFeatureState(did, fid, data);
                return res.json({
                    status: true
                })
            } catch (e) {
                console.error(e);
                console.log('Device or feature not found', req.query);
                return res.json({
                    status: false,
                    error: "Device or feature not found"
                });
            }
            
        } else {
            throw new Error(`Unsupported method ${method}`);
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
    
    app.post('/device/reg', asyncMiddleware(async (req: Request, res: Response) => {
        await DeviceManager.inst.register(req.body.id, req.body.name, req.body.features);
        res.json({
            status: true
        });
        console.log("Registered", req.body.id);
    }));
}