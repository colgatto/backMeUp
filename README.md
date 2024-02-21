# BakeMeUp

A tool to backup data from multiple remote servers using a simple config file, no setup on servers required.

It can dump SQL database, run generic command and save output and clone file.

All data are stored on tar.gz file on the local machine.

## Config.js Template

```js
const path = require('path');
// Include private.js with all authentications (see private template)
const private = require('./private');

module.exports = {

	// Enable basic log on stdout
	verbose: false,

	// Backup directory path
	backup_dir: path.join(__dirname, 'backup'),

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
```

## Private.js Template

```js
const { readFileSync } = require('fs'); // Used only for ssh privateKey

module.exports = {

	// Save all auth for same host inside same object
	// Optional, just for better organization
	my_remote_machine: {

		// SSH auth, used in all backup type
		ssh: {

			// Optional.
			// SSH Private key file, required if password is not set
			privateKey: readFileSync('/path/to/my/key'),

			// Required.
			// Hostname or IP of the remote host
			host: '10.10.10.10',

			// Required.
			// SSH username
			username: 'gramatik',

			// Optional.
			// SSH password, required if privateKey is not set
			password: 'passwordBetterThanThis'
		},

		// MySQL authentication, used for "sql" backup type
		mysql: {

			// Required.
			// MySQL username
			username: 'gramatik',

			// Required.
			// MySQL password
			password: 'passwordBetterThanThis'
		},

		// Sudo password, used in "sudo" key if you need sudo privileges
		sudo: 'passwordBetterThanThis'
	}
};
```