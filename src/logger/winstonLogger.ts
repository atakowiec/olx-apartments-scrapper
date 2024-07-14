import winston, {format, transports} from "winston"
import ansis from "ansis";

const consoleFormat = (label: string = "main") => format.combine(
  format.colorize({
    colors: {
      info: "bgGreen",
      warn: "bgYellow",
      error: "bgRed",
      debug: "bgBlue",
      silly: "bgMagenta",
    }
  }),
  format.label({label: label}),
  format.timestamp({format: "YYYY-MM-DD HH:mm:ss"}),
  format.printf(({level, message, label, timestamp}) => {
    return `${level} ${ansis.grey`[${timestamp}] [${label}]:`} ${message}`;
  })
);

const fileFormat = (label: string = "main") => format.combine(
  format.label({label: label}),
  format.timestamp({format: "YYYY-MM-DD HH:mm:ss"}),
  format.printf(({level, message, label, timestamp}) => {
    return `[${timestamp}] [${label}] ${level.toUpperCase()}: ${message}`;
  })
);

const loggerFactory = (label: string = "main") => winston.createLogger({
  level: "debug",
  transports: [
    new transports.Console({format: consoleFormat(label)}),
    new transports.File({filename: "logs/latest.log", format: fileFormat(label)})
  ]
})

export default loggerFactory