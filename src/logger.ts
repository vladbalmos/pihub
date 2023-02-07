import winston from "winston";

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.splat(),
        winston.format.json(),
    ),
    handleExceptions: true,
    handleRejections: true,
    transports: [
        new winston.transports.File({ filename: 'pihub.log' })
    ]
})

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        handleRejections: true,
        handleExceptions: true,
        format: winston.format.combine(
            winston.format.splat(),
            winston.format.simple(),
        ),
    }));
}

export default logger;