import dgram, { Socket, RemoteInfo } from 'node:dgram';
import { AddressInfo } from 'node:net';
import { EventEmitter } from 'node:stream';
import { networkInterfaces } from 'node:os';

export default class UDPServer extends EventEmitter {
    private port: number;
    private httpPort: number;
    private localAddress: string;
    private socket: Socket;
    
    constructor(port: number, httpPort: number) {
        super();
        this.port = port;
        this.httpPort = httpPort;
        this.socket = dgram.createSocket('udp4');
        this.localAddress = '0.0.0.0';
    }
    
    initialize(): Promise<string|null> {
        this.socket.on('error', (e:any) => {
            this.emit('error', e);
        });
        
        this.socket.on('message', (msg: Buffer, rinfo: RemoteInfo) => {
            const strmsg = msg.toString();
            if (strmsg !== 'request:whereareyou') {
                console.warn("Invalid message:", strmsg);
                return;
            }
            
            const response = `hub@:${this.localAddress}:${this.httpPort}`;
            this.socket.send(response, 0, response.length, rinfo.port, rinfo.address);
        });
        
        return new Promise((resolve, reject) => {
            this.socket.on('listening', async () => {
                const address = this.getLocalAddress();
                if (!address) {
                    reject(new Error('Unable to find local ip address'));
                }
                this.localAddress = address as string;
                resolve(address);
            });
            
            this.socket.bind(this.port);
        })
    }
    
    private getLocalAddress(): string|null {
        const nets = networkInterfaces();
        for (const iface in nets) {
            if (iface === 'lo') {
                continue;
            }

            const addresses  = nets[iface];
            if (!addresses) {
                continue;
            }

            for (const addr of addresses) {
                if (addr.family === 'IPv6' || addr.internal) {
                    continue
                }
                
                if (addr.address.slice(0, 3) === '192') {
                    return addr.address;
                }
            }
        };
        return null;
    }
}