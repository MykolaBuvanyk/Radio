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
