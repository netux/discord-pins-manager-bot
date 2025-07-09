import type { SlashCommand, Module } from '../../model';
import pingCommand from './ping.command';

export default class implements Module {
	readonly slashCommands: SlashCommand[] = [pingCommand];
}
