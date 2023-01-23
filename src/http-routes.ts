import { Application, Request, Response } from "express";

export default function router(app: Application, asyncMiddleware: CallableFunction) {
    
    app.get('/', asyncMiddleware(async (_: Request, res: Response) => {
        res.send('OK');
    }));
    
    app.all('/device/reg', asyncMiddleware(async (req: Request, res: Response) => {
        // Write features to ../data/devices.json
        // serialize writes
        // create responsive template
        console.log(req.body);
        res.send({
            status: 'ok'
        });
    }));
}