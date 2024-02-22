const fs = require('fs');
const { createHash } = require('crypto');

const timestr = () => {
	const now = new Date();
	return `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`
		+ `_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`
		+ `.${now.getMilliseconds().toString().padStart(3, '0')}`;
}

const setupDir = (dirPath) => {
	if(!fs.existsSync(dirPath)){
		fs.mkdirSync(dirPath);
	}else if(!fs.statSync(dirPath).isDirectory()){
		throw new Error(`"${dirPath}" is not a directory`);
	}
};

const validateSHA512 = (filepath, sha) => new Promise((resolve, reject) => {
	const hash = createHash('sha512');		  
	const rs = fs.createReadStream(filepath);
	rs.on('data', (data) => {
		hash.update(data);
	});
	rs.on('end', () => {
		resolve(hash.digest('hex') === sha);
	});
});

module.exports = {
	timestr,
	setupDir,
	validateSHA512
}