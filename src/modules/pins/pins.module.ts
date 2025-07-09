import type { SlashCommand, Module } from '../../model';
import pinsBackupCommand from './pins-backup.command';
import pinsInsertCommand from './pins-insert.command';

export default class implements Module {
	readonly slashCommands: SlashCommand[] = [
		pinsBackupCommand,
		pinsInsertCommand,
	];
}
