const path = require('path');
// Include private.js with all authentications (see private template)
const private = require('./private');

module.exports = {

	// Enable basic log on stdout
	verbose: false,

	// Backup directory path
	// If you run "npm installService" make sure user "backmeup" has read and write access to this directory
	backup_dir: path.join(__dirname, 'backup'),

	// Working directory on remote server
	tmp_dir: '/tmp/backMeUp',

	// Every type of backup must be defined inside this object
	// Backup are stored in <backup_dir>/<backup_name>/<backup_name>_<timestamp>.tar.gz
	// backup_name is the key inside this object
	backups: {

		// SQL backup example
		// Run sqldump on specified database
		// Remote host must have sqldump command
		sql_example: {

			// Required.
			// SSH auth (see private template)
			host: private.my_remote_machine.ssh,

			// Required.
			// Backup type
			type: 'sql',

			// Required for sql.
			// Database name
			database: 'shop',

			// Required for sql.
			// MySQL auth (see private template)
			auth: private.my_remote_machine.mysql,

			// Optional.
			// Ignore trigger in dump file
			skipTriggers: true,

			// Optional.
			// List of table name to ignore in dump file
			// Note that every table name must have database name as prefix
			ignore: [
				'shop.users',
				'shop.timesheet',
			],

			// Optional.
			// Use this if you need sudo privileges to read remote file (see private template)
			sudo: private.my_remote_machine.sudo,

			// Required.
			// When scheduled backup, based on crontab string
			cron: '*/3 * * * *',

			// Optional.
			// Backup retention limit in days
			// If it is omitted is illimited
			retentionDays: 90
		},

		// File backup example
		// Copy specified file from remote host
		file_example: {

			// Required.
			// SSH auth (see private template)
			host: private.my_remote_machine.ssh,

			// Required.
			// Backup type
			type: 'file',

			// Required for file.
			// Path to file on remote host to backup
			path: '/var/log/apache2/access.log',

			// Optional.
			// Use this if you need sudo privileges to read remote file (see private template)
			sudo: private.my_remote_machine.sudo,

			// Required.
			// When scheduled backup, based on crontab string
			cron: '*/3 * * * *',

			// Optional.
			// Backup retention limit in days
			// If it is omitted is illimited
			retentionDays: 90
		},

		// Exec backup example
		// Run specified command on remote host and backup output
		exec_example: {

			// Required.
			// SSH auth (see private template)
			host: private.my_remote_machine.ssh,

			// Required.
			// Backup type
			type: 'exec',

			// Required for exec.
			// Command to run on remote host
			command: 'tail /var/log/apache2/error.log',

			// Optional.
			// Use this if you need sudo privileges to run command on remote host (see private template)
			sudo: private.my_remote_machine.sudo,
			
			// Required.
			// When scheduled backup, based on crontab string
			cron: '40 * * * *',

			// Optional.
			// Backup retention limit in days
			// If it is omitted is illimited
			retentionDays: 90
		}
	}
};