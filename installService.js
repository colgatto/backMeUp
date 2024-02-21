const path = require('path');
const fs = require('fs');
const os = require("os");
const { execSync } = require('child_process');

if(process.platform != "linux"){
	return console.error('This command work only on linux');
}

if(os.userInfo().uid !== 0){
	return console.error('This command must be run with sudo');
}

const servicePath = '/etc/systemd/system/backMeUp.service';

const enableService = () => {
	execSync('systemctl enable backMeUp', {stdio: 'inherit'});
};

const userExist = execSync('id backmeup').toString().indexOf('no such user') == -1;

if(userExist){
	console.log('user "backmeup" already exist, skip creation');
}else{
	execSync('useradd backmeup');
	console.log('user "backmeup" created');
}

if(fs.existsSync(servicePath)){
	console.log('backMeUp Service already present');
}else{
	const serviceText = `[Unit]
Description=automatic backup service 
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=3
User=backmeup
ExecStart=/usr/bin/env node "${path.join(__dirname, 'main.js')}"

[Install]
WantedBy=multi-user.target`;
	
	fs.writeFileSync(servicePath, serviceText);
}

enableService();

console.log('All done');
console.log('Make sure user "backmeup" has read and write access to backup directory');
console.log('reboot system or run "systemctl start backMeUp"');