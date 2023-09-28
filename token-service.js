
angular.module('app').service('tokenService', function (constants, temps) {
    return {
        getValidAccessToken: function () {
            return new Promise(async (resolve, reject) => {

                if (this.validateAccessToken()) {
                    resolve();
                    return;
                } else if (this.validateRefreshToken()) {
                    await this.refreshAccessToken()
                        .then(success => {
                            resolve(success);
                        })
                        .catch(error => {
                            reject(error);
                        });
                    return;
                } else {
                    await this.authenticate()
                        .then(success => {
                            resolve(success);
                        })
                        .catch(error => {
                            reject(error);
                        });
                    return;
                }
            });
        },

        validateAccessToken: function () {
            if (constants.token && Object.keys(constants.token).length != 0) {
                var timeToLiveAccessToken = new Date(constants.token.validTo.split('.')[0]).getTime() - new Date().getTime();
                var minutesToLiveAccessToken = Math.floor(timeToLiveAccessToken / 60000);
                return minutesToLiveAccessToken > 5 ? true : false;
            }
            return false;
        },

        validateRefreshToken: function () {
            if (constants.token && Object.keys(constants.token).length != 0) {
                var timeToLiveRefreshToken = (new Date(constants.token.validTo.split('.')[0]).getTime() + (603900 * 1000));
                return timeToLiveRefreshToken > new Date().getTime() ? true : false;
            }
            return false;
        },

        refreshAccessToken: async function () {
            return new Promise(async (resolve, reject) => {
                await this.requestNewToken("refreshToken", constants.token)
                    .then(success => {
                        resolve(success);
                    })
                    .catch(error => {
                        reject(error);
                    });
                return;
            });
        },

        authenticate: async function () {
            return new Promise(async (resolve, reject) => {
                authenticationInformation = {
                    "ClientId": constants.loginIdent,
                    "ClientSecret": temps.password,
                    "Totp": temps.mfaCode
                };

                await this.requestNewToken("accessToken", authenticationInformation)
                    .then(success => {
                        delete temps.mfaCode;
                        resolve(success);
                    })
                    .catch(error => {
                        delete temps.mfaCode;
                        reject(error);
                    });
                return;
            });
        },

        requestNewToken: function (authenticationEndpoint, authenticationInformation) {
            return temps.inTokenRequest ? new Promise((resolve, reject) => { this.validateAccessToken ? resolve("still valid") : reject({ status: -8, exception: "token request duplicate could not be handled", xreq: null }) }) :
                new Promise((resolve, reject) => {
                    temps.inTokenRequest = true;
                    cordova.plugin.http.sendRequest(encodeURI(`${constants.wsHost}/api/${authenticationEndpoint}`), {
                        method: 'post',
                        headers: { 'Content-Type': 'application/json', 'Accept': '*/*' },
                        serializer: 'json',
                        data: authenticationInformation,
                        timeout: 2.0
                    }, function (response) {
                        temps.inTokenRequest = false;
                        try {
                            constants.setUserToken(JSON.parse(response.data));
                            resolve();
                        } catch (e) {
                            reject({ status: response.status, exception: e, xreq: response });
                        }
                    }, function (response) {
                        temps.inTokenRequest = false;
                        temps.loginError = true;
                        if (response.status === 401) delete constants.token;
                        if (!temps.mfaCode && constants.isMfaEnabled) {
                            reject({ status: -7, exception: "mfaCode is missing!", xreq: response });
                            return;
                        }
                        reject({ status: response.status, exception: null, xreq: response });
                    });
                });
        },
    }
});
