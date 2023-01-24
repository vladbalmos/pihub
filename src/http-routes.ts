import { Application, Request, Response } from "express";
import DeviceManager from "./DeviceManager";

export default function router(app: Application, asyncMiddleware: CallableFunction) {
    
    app.get('/', asyncMiddleware(async (_: Request, res: Response) => {
        const devices = DeviceManager.inst.all();
        // Create a partial for each type of feature - toggle, list
        
        return res.render('index', {
            test: 'test'
        });
    }));
    
    app.all('/device/reg', asyncMiddleware(async (req: Request, res: Response) => {
        DeviceManager.inst.register(req.body.id, req.body.name, req.body.features);
        console.log("Registered", req.body.id);
        res.send();
    }));
}