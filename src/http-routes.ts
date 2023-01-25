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
    
    app.all('/device/reg', asyncMiddleware(async (req: Request, res: Response) => {
        DeviceManager.inst.register(req.body.id, req.body.name, req.body.features);
        console.log("Registered", req.body.id);
        res.send();
    }));
}