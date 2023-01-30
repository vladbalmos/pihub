type DeviceManagerOptions = {
    datadir: string
}

type Device = {
    name: string,
    id: string,
    requestTopic: string,
    responseTopic: string,
    features: object,
    featuresHash: string,
    state: any[]|null,
    lastSeen: Date
}

type DeviceRegistration = {
    requestTopic: string,
    responseTopic: string,
    state: {
        name: string,
        id: string,
        features: object
    }
}