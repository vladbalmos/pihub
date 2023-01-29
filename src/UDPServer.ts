import dgram, { Socket, RemoteInfo } from 'node:dgram';
import { EventEmitter } from 'node:stream';
import { networkInterfaces } from 'node:os';
import { delay } from './utils';

export default class UDPServer extends EventEmitter {
    private port: number;
    private httpPort: number;
    private localAddress: string;
    private broadcastAddress: string;
    private broadcastPort: number;
    private socket: Socket;
    
    constructor(port: number, httpPort: number) {
        super();
        this.port = port;
        this.httpPort = httpPort;
        this.socket = dgram.createSocket('udp4');
        this.broadcastAddress = '255.255.255.255';
        this.broadcastPort = 3000;
        this.localAddress = '0.0.0.0';
    }
    
    initialize(): Promise<string|null> {
        this.socket.on('error', (e:any) => {
            this.emit('error', e);
        });
        
        this.socket.on('message', (msg: Buffer, rinfo: RemoteInfo) => {
            const strmsg = msg.toString();
            if (strmsg.indexOf('request:whereareyou') !== 0) {
                console.warn("Invalid message:", strmsg);
                return;
            }
            
            const response = `hub@:${this.localAddress}:${this.httpPort}`;
            this.broadcast(response);
        });
        
        return new Promise((resolve, reject) => {
            this.socket.on('listening', async () => {
                const address = this.getLocalAddress();
                if (!address) {
                    reject(new Error('Unable to find local ip address'));
                }
                this.localAddress = address as string;
                this.socket.setBroadcast(true);
                resolve(address);
            });
            
            this.socket.bind(this.port);
        })
    }
    
    broadcast(msg): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket.send(msg, 0, msg.length, this.broadcastPort, this.broadcastAddress, (err, x) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });    
        })
    }
    
    async broadcastStateUpdateRequest(details: {
        deviceId: string,
        featureId: string
    }) {
        
        const id = process.hrtime.bigint().toString();
        const msg = `${details.deviceId}:request_state_update:${id}:${details.featureId}`;
        try {
            console.log(`Broadcasting`, msg);
            await this.broadcast(msg);
        } catch (e) {
            console.log('Unable to send message');
            console.error(e);
        }
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