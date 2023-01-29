type DeviceManagerOptions = {
    datadir: string
}

type Device = {
    name: string,
    id: string,
    features: object,
    featuresHash: string,
    state: any[]|null,
    lastSeen: Date
}
