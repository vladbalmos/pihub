import { createServer } from "http";
import express from 'express'
import EventEmitter from "events";

export default class HttpServer extends EventEmitter {
    
    private port: number;
    private app: express.Application;
    
    constructor(port: number) {
        super();

        const app = express();
        this.app = app;
        this.port = port;
        
        this.initExpressApp();
    }
    
    initExpressApp() {
        this.app.set('port', this.port);
        this.app.set('view engine', 'ejs');
        this.app.set('views', `${__dirname}/../src/views`);
        this.app.use(express.json())
        this.app.use(express.urlencoded())
    }
    
    setRouter(fn: CallableFunction) {
        fn(this.app, this.asyncMiddleware);
    }
    
    initialize(): Promise<void> {
        const server = createServer(this.app);
        return new Promise((resolve, reject) => {
            let listening = false;

            server.on('listening', () => {
                listening = true;
                resolve();
            });
            server.on('error', (e) => {
                console.error(e);
                if (!listening) {
                    return reject(e);
                }
                
                this.emit('error', e);
            })

            server.on('close', () => {
                listening = false;
                this.emit('close');
            })
            
            server.listen(this.port);
        })
    }
    
    
    asyncMiddleware(fn: CallableFunction) {
        return (req: express.Request, res: express.Response, next: CallableFunction) => {
            Promise.resolve(fn(req, res, next))
                   .catch((e) => { console.error(e); next(e) });
        }
    }
    
}