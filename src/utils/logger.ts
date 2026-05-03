export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private static level: LogLevel = LogLevel.INFO;

  public static setLevel(level: LogLevel) {
    this.level = level;
  }

  public static debug(message: string, ...args: any[]) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[BentoGuard:DEBUG] ${message}`, ...args);
    }
  }

  public static info(message: string, ...args: any[]) {
    if (this.level <= LogLevel.INFO) {
      console.info(`[BentoGuard:INFO] ${message}`, ...args);
    }
  }

  public static warn(message: string, ...args: any[]) {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[BentoGuard:WARN] ${message}`, ...args);
    }
  }

  public static error(message: string, ...args: any[]) {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[BentoGuard:ERROR] ${message}`, ...args);
    }
  }
}
