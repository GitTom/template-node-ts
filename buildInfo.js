// buildInfo
// If you plan to check-in buildInfo.jsonc, than maybe just modify package.json?
// But note that accessing package.json from your /src folder below it causes TSC to shift the whole output tree.
// If you do want to just modify package.json, consider using https://docs.npmjs.com/cli/version, eg.
// 'npm version prerelease' cmd increments the build# of package.json version.
const fs = require('fs');

const pkgjson = require('./package.json');

const buildInfoFspec = './src/buildInfo.json';
let buildInfo = null;
try {
  buildInfo = require( buildInfoFspec );
} catch( e ) {
  console.log( `Can't find ${buildInfoFspec}, creating new one...` );
  buildInfo = {
    "stage": "dev",
    "version": pkgjson.version
  }
}


buildInfo.buildNum = 1 + (Number.isInteger( buildInfo.buildNum ) ? buildInfo.buildNum : 0);
const d = new Date();
buildInfo.buildTime = d.toISOString();

console.log( `Building ver=${pkgjson.version}, build# ${buildInfo.buildNum},\
 at ${buildInfo.buildTime}.` );

fs.writeFile( buildInfoFspec, JSON.stringify( buildInfo, null, 2 ), (err) => {
  if (err) throw err;
  console.log( `The file ${buildInfoFspec} has been saved.` );
} );
