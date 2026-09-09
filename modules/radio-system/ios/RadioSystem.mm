#import "RadioSystem.h"

@implementation RadioSystem
- (NSDictionary *)getPowerManagementStatus
{
  return @{
    @"isSupported": @NO,
    @"isIgnoringBatteryOptimizations": @YES,
    @"canRequestBatteryOptimizationExemption": @NO,
    @"hasAggressivePowerManagement": @NO,
    @"manufacturer": @"Apple",
    @"model": @"iOS",
    @"sdkVersion": @0,
  };
}

- (NSNumber *)requestBatteryOptimizationExemption
{
  return @NO;
}

- (NSNumber *)openBatteryOptimizationSettings
{
  return @NO;
}

- (NSNumber *)openApplicationSettings
{
  return @NO;
}

- (void)startRadioRetrySession:(NSString *)stationId
{
}

- (void)setRadioRetryEnabled:(NSString *)stationId enabled:(BOOL)enabled
{
}

- (void)stopRadioRetrySession
{
}

- (void)reportRadioPlaybackError:(NSString *)stationId reason:(NSString *)reason
{
}

- (void)reportRadioPlaybackState:(NSString *)stationId state:(NSString *)state
{
}

- (NSDictionary *)getRadioRetryStats
{
  return @{
    @"stationId": [NSNull null],
    @"retryCount": @0,
    @"consecutiveRetryCount": @0,
    @"recoveryCount": @0,
    @"bufferingCount": @0,
    @"totalBufferingMs": @0,
    @"lastBufferingMs": @0,
    @"networkSwitchCount": @0,
    @"networkType": @"none",
    @"isWaitingForNetwork": @NO,
  };
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeRadioSystemSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"RadioSystem";
}

@end
