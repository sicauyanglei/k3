import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

export function getUserDataPath(): string {
  return app.getPath('userData')
}

export function getDataPath(): string {
  const dataPath = join(getUserDataPath(), 'data')
  if (!existsSync(dataPath)) {
    mkdirSync(dataPath, { recursive: true })
  }
  return dataPath
}

export function getBackupPath(): string {
  const backupPath = join(getUserDataPath(), 'backup')
  if (!existsSync(backupPath)) {
    mkdirSync(backupPath, { recursive: true })
  }
  return backupPath
}

export function getExportPath(): string {
  const exportPath = join(getUserDataPath(), 'exports')
  if (!existsSync(exportPath)) {
    mkdirSync(exportPath, { recursive: true })
  }
  return exportPath
}

export function getLogPath(): string {
  const logPath = join(getUserDataPath(), 'logs')
  if (!existsSync(logPath)) {
    mkdirSync(logPath, { recursive: true })
  }
  return logPath
}

export function getTemplatePath(): string {
  return join(getUserDataPath(), 'templates')
}

export function getAccountPath(): string {
  const accountPath = join(getDataPath(), 'accounts')
  if (!existsSync(accountPath)) {
    mkdirSync(accountPath, { recursive: true })
  }
  return accountPath
}
