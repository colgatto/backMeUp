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