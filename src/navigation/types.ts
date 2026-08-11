import type { NavigatorScreenParams } from '@react-navigation/native';

/** Stack inside the "Plan" tab: build a route, then drive it. */
export type PlannerStackParamList = {
  RoutePlanner: undefined;
  ActiveDelivery: undefined;
};

/** The bottom tabs. */
export type RootTabParamList = {
  PlanTab: NavigatorScreenParams<PlannerStackParamList>;
  AddressBookTab: undefined;
  TemplatesTab: undefined;
  HistoryTab: undefined;
};
