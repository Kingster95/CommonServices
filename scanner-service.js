(function () {
    'use strict';
    angular.module('app').service('ScannerService', ScannerService);

    ScannerService.$inject = ['$q'];

    function ScannerService($q) {
        let scannerService = this;
        if (!scannerService.logger) {
            scannerService.logger = Logger.getInstance("ScannerService");
        }
        scannerService.scan = function (options) {
            let logMethod = scannerService.logger.startMethod("scan");
            let scanOptions = options | {
                showTorchButton: true,
                disableAnimations: true,
                showFlipCameraButton: true
            };
            logMethod.logObj(Logger.lvlDebug, scanOptions, "Scan options:");
            return $q(function (resolve, reject) {
                cordova.plugins.barcodeScanner.scan(
                    function (result) {
                        logMethod.logObj(Logger.lvlDebug, result, "Scan successful with result:");
                        logMethod.end();
                        resolve(result);
                    },
                    function (error) {
                        logMethod.logObj(Logger.lvlError, error, "Scan failed with error:");
                        logMethod.end();
                        reject(error);
                    },
                    scanOptions
                );
            });
        };

        scannerService.scanMultiple = function (options) {
            let logMethod = scannerService.logger.startMethod("scanMultiple");
            let scanResults = [];
            let scanResult;
            return $q(async function (resolve, reject) {
                do {
                    scanResult = await scannerService.scan(options);
                    if (!scanResult) continue;
                    if (!scanResult.cancelled) scanResults.push(scanResult);
                } while (scanResult.cancelled != true);
                logMethod.logObj(Logger.lvlDebug, scanResults, "Scan results:");
                logMethod.end();
                if (scanResults.length == 0) reject(null);
                resolve(scanResults);
            });
        };
    }
})();