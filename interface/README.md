# Pos Pool Interface

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.


### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### modify chain config

In interface/src/utils/cfx.js, modify the value of cfxUrl to configure the address of the chain rpc after produce.
In interface/craco.config.js, modify the value of TestServerUrl to configure the address of the chain rpc in dev.

In interface/src/constants/index.js, modify the value of NETWORK_ID_MAINNET | NETWORK_ID_TESTNET to configure the chainId.


### modify contract address

In interface/src/utils/cfx.js, modify the value of posPoolManagerAddressTestnet | posPoolManagerAddressMainnet to configure the contract address.


### add i18n text

First, add a folder named target language key to the interface/public/locales folder.
copy the translation.json file from the locales/en folder.

Then change the value in the copied translation.json file to the translation of the target language.

Next, import the new language file in locales/index.js and add it to the resources field.
(You can change the default language by modifying the lng field.)

Finally, in Interface/src/pages/components/Header/index.js, add an Option corresponding to the language key under Language Select.