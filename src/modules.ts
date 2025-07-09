import type { Client as DiscordClient } from 'discord.js';
import { type Module } from './model';
import PingModule from './modules/ping/ping.module';
import PinsModule from './modules/pins/pins.module';
import ReadyModule from './modules/ready/ready.module';

type Dependencies = {
	discordClient: DiscordClient;
};

type ModuleFactory = (dependencies: Dependencies) => Module;

const MODULES = {
	ready: () => new ReadyModule(),
	ping: () => new PingModule(),
	pins: () => new PinsModule(),
} satisfies Record<string, ModuleFactory>;

const instances: {
	[M in keyof typeof MODULES]?: ReturnType<(typeof MODULES)[M]>;
} = {};
export default (dependencies: Dependencies): Record<string, Module> => {
	for (const [moduleName, factory] of Object.entries(MODULES)) {
		const instance = (factory as ModuleFactory)(dependencies);
		instances[moduleName] = instance;
	}

	return instances;
};
