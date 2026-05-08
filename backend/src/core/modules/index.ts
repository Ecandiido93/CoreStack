import { Router } from "express";

export interface AppModule {
  path: string;
  router: Router;
  name: string;
}

const registeredModules: AppModule[] = [];

export function registerModule(module: AppModule) {
  registeredModules.push(module);
}

export function getModules(): AppModule[] {
  return registeredModules;
}
