// fbf; GitTom 2019-10

// Env vars
// https://firebase.google.com/docs/functions/config-env
// Accessed in very proprietary way (functions.config()), not like Lambda.
// From my AWS Lambda:
// DUMP_EVENT
// TMM_PROXY =   // I used this to enable proxy from AWS Lambda to C9 (enabled == TMM_PROXY is 'true')
// DEBUG = *    // I think this was for using the 3rd party 'debug' module.
// So I guess I don't need any of these for this module.

//#region imports
import * as fadmin from 'firebase-admin';
import * as fbf from 'firebase-functions';

import * as fireorm from 'fireorm';
//#endregion imports

// Assertions
// 1. console.assert is not quite what I think of as assert, but is fine and available in browsers & Node >= v10.
// (All it does is log the obj/msg param, so an assert with just the condition is useless.)
// https://developer.mozilla.org/en-US/docs/Web/API/console/assert
// 2. Node >= v10 also has an Assert module/class, with a fuller API for testing.
// And there is an equivelent module for the browser that even has the same name ('assert').
// https://github.com/browserify/commonjs-assert

const { log, warn, error, assert } = console; // eslint-disable-line no-unused-vars

// import * as pkgjson from '../package.json'; // NO - this causes tsc to shift the root of lib.

import * as buildInfo from './buildInfo.json';
log( `Func ${process.env.K_SERVICE}, rev=${process.env.K_REVISION}; \
  Build ver=${buildInfo.version} #${buildInfo.buildNum}, at ${buildInfo.buildTime}.`);

// Initialize the Firebase Admin SDK (before requiring my other files)
// https://firebase.google.com/docs/admin/setup#initialize_the_sdk

// turn off 'no-import-side-effect'
import "./config.js";
// This loads some constants into global (will probably change this).

// BUT I think I don't need the parameters anymore!!
// https://firebase.google.com/docs/functions/config-env#automatically_populated_environment_variables

// import * as serviceAccount from "./private/admin-svcacct-key.json";
// const sa = serviceAccount as fadmin.ServiceAccount;
// I'm confused - to pass serviceAccount to fadmin.credential.cert 
// (which would be better then passing it the path - more static checking) it needs
// to be of type fadmin.ServiceAccount, but the attributes names don't match eg. 'client_email' vs 'clientEmail'.

// -- Initialize Firebase Admin SDK
// https://firebase.google.com/docs/admin/setup/

// log( 'FIREBASE_CONFIG=\n', process.env.FIREBASE_CONFIG );
// {"projectId":"page-info","databaseURL":"https://page-info.firebaseio.com","storageBucket":"page-info.appspot.com","locationId":"us-east4"}

// Simplest (new) method:
fadmin.initializeApp();
const fstore = fadmin.firestore();

fireorm.Initialize( fstore );


// const adminConfig = JSON.parse( process.env.FIREBASE_CONFIG as string );
// adminConfig.credential = fadmin.credential.applicationDefault()
// // adminConfig.credential = fadmin.credential.cert( "./dist/private/admin-svcacct-key.json" );
// //  SERVICE_ACCOUNT_PATH as param here is relative to package root, ie. functions folder.
// fadmin.initializeApp( adminConfig );


// FBF - spreading handlers into multiples files
// https://stackoverflow.com/q/43486278/how-do-i-structure-cloud-functions-for-firebase-to-deploy-multiple-functions-fro
// Has an answer specifically for TypeScript.

// An example of the direct export of import syntax that I favoured...
// export { onPublishBudget } from './gcpBudgetHandler'; // from gcp-admin project.
// But now I prefer to keep dependency on FBF in index, and allow the handler
// to be called artificially (directly by my code, eg. for testing) so I prefer this syntax...

import { onFbaUserCreateHandler, onFbaUserDeleteHandler } from './onFbaUser';

export const onFbaUserCreate = fbf.auth.user().onCreate( onFbaUserCreateHandler );
export const onFbaUserDelete = fbf.auth.user().onDelete( onFbaUserDeleteHandler );


// -- Web interface & Admin Commands
// Using dynamic imports so they don't have to be imported for the other, regular, function instances.

import * as fs from 'fs';

export const setup = fbf.https
  .onRequest( (req: any, res: any): void => {
    // These params should be 'Express.Request/Request.Response' 
    // but the types definitions don't match so I have to use 'any'.
    log( `// ---- setup page ---------------------------------` );

    const HTML_FILESPEC = './web/index.html';
    log( `Loading file ${HTML_FILESPEC}.` );
    const index: string = fs.readFileSync( HTML_FILESPEC, 'utf8' );
    //  If the encoding option is specified then this function returns a string. Otherwise it returns a buffer.
  
    res.status(200).send( index );
    return;
    
    // import( './httpSetupReq' ).then( (imp): void => {
    //   imp.onRequestSetupPageHandler( req, res );
    // });
  } );

export const adminCmds = fbf.https
  .onRequest( (req: Express.Request, res: Express.Response): void => {
    import( './adminCmds' ).then( (imp): void => {
      imp.onRequestAdminCmdsHandler( req, res );
    });
  } );


// 2019-01-28 Adding this new ways to handle adminCmds...
// And anything else that is invoked via HTTP so calls send() to end function.
const PS_TOPIC_ADMIN_CMDS = 'admin-cmd'; // projects/outline-65932/topics/admin-cmds
export const onPublishAdminCmds = fbf.pubsub.topic( PS_TOPIC_ADMIN_CMDS )
  .onPublish( async (msg: any, ctx: any): Promise<any> => {
    let respP = Promise.resolve(true);
    // Since I use 'await' (so I can return the promise) I guess I don't need the 'then' construct.
    // But I think tsc doesn't like a conditional import without the then?
    await import( './adminCmds' ).then( (adc): void => {
      respP = adc.onPublishAdminCmdsHandler( msg, ctx );
    });
    // require( './adminCmds' ).onPublishAdminCmdsHandler( msg, ctx );
    assert( respP );
    return respP;
  } );
