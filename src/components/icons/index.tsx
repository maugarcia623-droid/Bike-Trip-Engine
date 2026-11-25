import React, { createContext, useContext } from 'react';
import {
  AlarmClock as DuotoneAlarmClock,
  Apple as DuotoneApple,
  ArrowDown as DuotoneArrowDown,
  ArrowLeft as DuotoneArrowLeft,
  ArrowRight as DuotoneArrowRight,
  ArrowRightLeft as DuotoneArrowRightLeft,
  ArrowUp as DuotoneArrowUp,
  ArrowUpLeft as DuotoneArrowUpLeft,
  ArrowUpRight as DuotoneArrowUpRight,
  BadgeInfo as DuotoneBadgeInfo,
  Banana as DuotoneBanana,
  Banknote as DuotoneBanknote,
  BatteryCharging as DuotoneBatteryCharging,
  Bed as DuotoneBed,
  BedDouble as DuotoneBedDouble,
  Bell as DuotoneBell,
  BellOff as DuotoneBellOff,
  BellRing as DuotoneBellRing,
  Bike as DuotoneBike,
  BikeFast as DuotoneBikeFast,
  Bin as DuotoneBin,
  BookOpen2 as DuotoneBookOpen2,
  Bottle as DuotoneBottle,
  Briefcase as DuotoneBriefcase,
  Bug as DuotoneBug,
  Buildings as DuotoneBuildings,
  Calculator as DuotoneCalculator,
  Calendar as DuotoneCalendar,
  CalendarDays as DuotoneCalendarDays,
  Camera as DuotoneCamera,
  Check as DuotoneCheck,
  ChevronLeft as DuotoneChevronLeft,
  ChevronRight as DuotoneChevronRight,
  CircleAlert as DuotoneCircleAlert,
  CircleArrowUpRight as DuotoneCircleArrowUpRight,
  CircleCheck as DuotoneCircleCheck,
  CircleChevronDown as DuotoneCircleChevronDown,
  CircleChevronRight as DuotoneCircleChevronRight,
  CircleChevronUp as DuotoneCircleChevronUp,
  CircleDashedCheck as DuotoneCircleDashedCheck,
  CircleStop as DuotoneCircleStop,
  CircleUser as DuotoneCircleUser,
  CircleX as DuotoneCircleX,
  CircleZap as DuotoneCircleZap,
  ClipboardCheck as DuotoneClipboardCheck,
  Clock as DuotoneClock,
  Clock3 as DuotoneClock3,
  Cloud as DuotoneCloud,
  CloudCheck as DuotoneCloudCheck,
  CloudDownload as DuotoneCloudDownload,
  CloudLightning as DuotoneCloudLightning,
  CloudMoon as DuotoneCloudMoon,
  CloudRain as DuotoneCloudRain,
  CloudSun as DuotoneCloudSun,
  Clouds as DuotoneClouds,
  Coffee as DuotoneCoffee,
  Compass as DuotoneCompass,
  Cookie as DuotoneCookie,
  Copy as DuotoneCopy,
  CornerDownLeft as DuotoneCornerDownLeft,
  Croissant as DuotoneCroissant,
  Download as DuotoneDownload,
  Droplet as DuotoneDroplet,
  Droplets as DuotoneDroplets,
  Eye as DuotoneEye,
  EyeOff as DuotoneEyeOff,
  FaceSmile as DuotoneFaceSmile,
  Feather as DuotoneFeather,
  FileText as DuotoneFileText,
  Flag as DuotoneFlag,
  Flame as DuotoneFlame,
  Flame2 as DuotoneFlame2,
  Flashlight as DuotoneFlashlight,
  Fullscreen as DuotoneFullscreen,
  FullscreenExit as DuotoneFullscreenExit,
  Gauge as DuotoneGauge,
  Grid2x2 as DuotoneGrid2x2,
  GridCirclesCheck as DuotoneGridCirclesCheck,
  GripVertical as DuotoneGripVertical,
  Hamburger as DuotoneHamburger,
  HandClosed as DuotoneHandClosed,
  Hanger as DuotoneHanger,
  Headphones as DuotoneHeadphones,
  HeartPulse as DuotoneHeartPulse,
  Home as DuotoneHome,
  HomeSmile as DuotoneHomeSmile,
  Info as DuotoneInfo,
  KeyRound as DuotoneKeyRound,
  Language as DuotoneLanguage,
  Layers as DuotoneLayers,
  Leaf as DuotoneLeaf,
  Lightbulb as DuotoneLightbulb,
  LightbulbSparkles as DuotoneLightbulbSparkles,
  Link2 as DuotoneLink2,
  List as DuotoneList,
  LoaderCircle as DuotoneLoaderCircle,
  LocateFixed as DuotoneLocateFixed,
  LocateOff as DuotoneLocateOff,
  Lock as DuotoneLock,
  LogOut as DuotoneLogOut,
  Luggage as DuotoneLuggage,
  Mail as DuotoneMail,
  Map as DuotoneMap,
  MapPin as DuotoneMapPin,
  Minus as DuotoneMinus,
  Monitor2Check as DuotoneMonitor2Check,
  Moon as DuotoneMoon,
  MountainSnow as DuotoneMountainSnow,
  Navigation as DuotoneNavigation,
  Newspaper as DuotoneNewspaper,
  OctagonX as DuotoneOctagonX,
  Package as DuotonePackage,
  Pen as DuotonePen,
  PencilRuler as DuotonePencilRuler,
  Play as DuotonePlay,
  Plus as DuotonePlus,
  Printer as DuotonePrinter,
  Radar as DuotoneRadar,
  Receipt as DuotoneReceipt,
  RefreshCcw as DuotoneRefreshCcw,
  RefreshCw as DuotoneRefreshCw,
  Rocket as DuotoneRocket,
  RotateCcw as DuotoneRotateCcw,
  Route as DuotoneRoute,
  Save as DuotoneSave,
  Scale as DuotoneScale,
  Scissors as DuotoneScissors,
  Search as DuotoneSearch,
  Send as DuotoneSend,
  Settings as DuotoneSettings,
  Share as DuotoneShare,
  Shield as DuotoneShield,
  ShieldAlert as DuotoneShieldAlert,
  ShieldCheck as DuotoneShieldCheck,
  Shirt as DuotoneShirt,
  ShoppingBag as DuotoneShoppingBag,
  ShowerHead as DuotoneShowerHead,
  Skull as DuotoneSkull,
  SlidersHorizontal as DuotoneSlidersHorizontal,
  Snowflake as DuotoneSnowflake,
  Sparkle as DuotoneSparkle,
  SquareArrowOutUpRight as DuotoneSquareArrowOutUpRight,
  SquareCheck as DuotoneSquareCheck,
  Star as DuotoneStar,
  Store as DuotoneStore,
  Sun as DuotoneSun,
  Sunrise as DuotoneSunrise,
  Sunset as DuotoneSunset,
  Target as DuotoneTarget,
  Tent as DuotoneTent,
  Thermometer as DuotoneThermometer,
  ThumbsUp as DuotoneThumbsUp,
  Timer as DuotoneTimer,
  TimerReset as DuotoneTimerReset,
  Train as DuotoneTrain,
  TriangleAlert as DuotoneTriangleAlert,
  Trophy as DuotoneTrophy,
  Umbrella as DuotoneUmbrella,
  Unlock as DuotoneUnlock,
  Upload as DuotoneUpload,
  User as DuotoneUser,
  Users as DuotoneUsers,
  Utensils as DuotoneUtensils,
  Volume as DuotoneVolume,
  VolumeX as DuotoneVolumeX,
  Waves as DuotoneWaves,
  Wind as DuotoneWind,
  Wrench as DuotoneWrench,
  X as DuotoneX,
  Zap as DuotoneZap,
} from '@keyline-icons/react/duotone';

export interface IconContextValue {
  weight?: string;
  color?: string;
  secondaryColor?: string;
  size?: number | string;
  className?: string;
}

export const IconContext = createContext<IconContextValue>({ weight: 'duotone' });

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  weight?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

function createKeylineIcon(
  Component: React.ComponentType<any>,
  displayName?: string
): React.FC<IconProps> {
  const Icon: React.FC<IconProps> = ({
    size,
    className = '',
    primaryColor,
    secondaryColor,
    style,
    weight: _weight,
    ...rest
  }) => {
    const ctx = useContext(IconContext);
    if (!Component) return null;
    const finalSize = size ?? ctx.size ?? 24;
    const finalPrimary = primaryColor ?? ctx.color;
    const finalSecondary = secondaryColor ?? ctx.secondaryColor;
    const combinedStyle: React.CSSProperties = {
      ...style,
      ...(finalPrimary ? { color: finalPrimary } : {}),
      ...(finalSecondary ? ({ '--icon-secondary': finalSecondary } as any) : {}),
    };

    return (
      <Component
        size={finalSize}
        className={`keyline-icon duotone-icon ${ctx.className || ''} ${className}`.trim()}
        style={combinedStyle}
        {...rest}
      />
    );
  };
  if (displayName) Icon.displayName = displayName;
  return Icon;
}

// ── CORE APPLICATION ICONS (TREE-SHAKEABLE KEYLINE ROUNDED DUOTONE) ──

// Navigation & Actions
export const Bike = /*#__PURE__*/ createKeylineIcon(DuotoneBike, 'Bike');
export const Bicycle = Bike;
export const Sun = /*#__PURE__*/ createKeylineIcon(DuotoneSun, 'Sun');
export const Moon = /*#__PURE__*/ createKeylineIcon(DuotoneMoon, 'Moon');
export const SlidersHorizontal = /*#__PURE__*/ createKeylineIcon(DuotoneSlidersHorizontal, 'SlidersHorizontal');
export const Sliders = SlidersHorizontal;
export const Grid2x2 = /*#__PURE__*/ createKeylineIcon(DuotoneGrid2x2, 'Grid2x2');
export const GridCirclesCheck = /*#__PURE__*/ createKeylineIcon(DuotoneGridCirclesCheck, 'GridCirclesCheck');
export const SquaresFour = Grid2x2;
export const Plus = /*#__PURE__*/ createKeylineIcon(DuotonePlus, 'Plus');
export const Minus = /*#__PURE__*/ createKeylineIcon(DuotoneMinus, 'Minus');
export const X = /*#__PURE__*/ createKeylineIcon(DuotoneX, 'X');
export const CircleX = /*#__PURE__*/ createKeylineIcon(DuotoneCircleX, 'CircleX');
export const XCircle = CircleX;
export const Check = /*#__PURE__*/ createKeylineIcon(DuotoneCheck, 'Check');
export const CircleCheck = /*#__PURE__*/ createKeylineIcon(DuotoneCircleCheck, 'CircleCheck');
export const CheckCircle = CircleCheck;
export const CheckCircle2 = CircleCheck;
export const SquareCheck = /*#__PURE__*/ createKeylineIcon(DuotoneSquareCheck, 'SquareCheck');
export const CheckSquare = SquareCheck;
export const CircleChevronDown = /*#__PURE__*/ createKeylineIcon(DuotoneCircleChevronDown, 'CircleChevronDown');
export const CircleChevronUp = /*#__PURE__*/ createKeylineIcon(DuotoneCircleChevronUp, 'CircleChevronUp');
export const CircleChevronRight = /*#__PURE__*/ createKeylineIcon(DuotoneCircleChevronRight, 'CircleChevronRight');
export const CaretDown = CircleChevronDown;
export const CaretUp = CircleChevronUp;
export const ChevronDown = CircleChevronDown;
export const ChevronUp = CircleChevronUp;
export const ChevronLeft = /*#__PURE__*/ createKeylineIcon(DuotoneChevronLeft, 'ChevronLeft');
export const ChevronRight = /*#__PURE__*/ createKeylineIcon(DuotoneChevronRight, 'ChevronRight');
export const GripVertical = /*#__PURE__*/ createKeylineIcon(DuotoneGripVertical, 'GripVertical');
export const Fullscreen = /*#__PURE__*/ createKeylineIcon(DuotoneFullscreen, 'Fullscreen');
export const FullscreenExit = /*#__PURE__*/ createKeylineIcon(DuotoneFullscreenExit, 'FullscreenExit');
export const Maximize2 = Fullscreen;
export const Minimize2 = FullscreenExit;
export const ArrowLeft = /*#__PURE__*/ createKeylineIcon(DuotoneArrowLeft, 'ArrowLeft');
export const ArrowRight = /*#__PURE__*/ createKeylineIcon(DuotoneArrowRight, 'ArrowRight');
export const ArrowUp = /*#__PURE__*/ createKeylineIcon(DuotoneArrowUp, 'ArrowUp');
export const ArrowDown = /*#__PURE__*/ createKeylineIcon(DuotoneArrowDown, 'ArrowDown');
export const ArrowUpRight = /*#__PURE__*/ createKeylineIcon(DuotoneArrowUpRight, 'ArrowUpRight');
export const ArrowUpLeft = /*#__PURE__*/ createKeylineIcon(DuotoneArrowUpLeft, 'ArrowUpLeft');
export const Play = /*#__PURE__*/ createKeylineIcon(DuotonePlay, 'Play');
export const CircleStop = /*#__PURE__*/ createKeylineIcon(DuotoneCircleStop, 'CircleStop');
export const Volume = /*#__PURE__*/ createKeylineIcon(DuotoneVolume, 'Volume');
export const VolumeX = /*#__PURE__*/ createKeylineIcon(DuotoneVolumeX, 'VolumeX');
export const Bell = /*#__PURE__*/ createKeylineIcon(DuotoneBell, 'Bell');
export const BellOff = /*#__PURE__*/ createKeylineIcon(DuotoneBellOff, 'BellOff');
export const BellRing = /*#__PURE__*/ createKeylineIcon(DuotoneBellRing, 'BellRing');
export const LocateFixed = /*#__PURE__*/ createKeylineIcon(DuotoneLocateFixed, 'LocateFixed');
export const LocateOff = /*#__PURE__*/ createKeylineIcon(DuotoneLocateOff, 'LocateOff');
export const RotateCcw = /*#__PURE__*/ createKeylineIcon(DuotoneRotateCcw, 'RotateCcw');
export const ArrowCounterClockwise = RotateCcw;
export const RefreshCcw = /*#__PURE__*/ createKeylineIcon(DuotoneRefreshCcw, 'RefreshCcw');
export const RefreshCw = /*#__PURE__*/ createKeylineIcon(DuotoneRefreshCw, 'RefreshCw');
export const ArrowsClockwise = RefreshCcw;
export const ArrowRightLeft = /*#__PURE__*/ createKeylineIcon(DuotoneArrowRightLeft, 'ArrowRightLeft');
export const ArrowsLeftRight = ArrowRightLeft;
export const Printer = /*#__PURE__*/ createKeylineIcon(DuotonePrinter, 'Printer');
export const List = /*#__PURE__*/ createKeylineIcon(DuotoneList, 'List');
export const Copy = /*#__PURE__*/ createKeylineIcon(DuotoneCopy, 'Copy');
export const Bin = /*#__PURE__*/ createKeylineIcon(DuotoneBin, 'Bin');
export const Trash = Bin;
export const Pen = /*#__PURE__*/ createKeylineIcon(DuotonePen, 'Pen');
export const PencilSimple = Pen;
export const Save = /*#__PURE__*/ createKeylineIcon(DuotoneSave, 'Save');
export const FloppyDisk = Save;
export const LoaderCircle = /*#__PURE__*/ createKeylineIcon(DuotoneLoaderCircle, 'LoaderCircle');
export const Loader2 = LoaderCircle;
export const Loader = LoaderCircle;
export const SpinnerGap = LoaderCircle;
export const Info = /*#__PURE__*/ createKeylineIcon(DuotoneInfo, 'Info');
export const BadgeInfo = /*#__PURE__*/ createKeylineIcon(DuotoneBadgeInfo, 'BadgeInfo');
export const Download = /*#__PURE__*/ createKeylineIcon(DuotoneDownload, 'Download');
export const Layers = /*#__PURE__*/ createKeylineIcon(DuotoneLayers, 'Layers');
export const FileText = /*#__PURE__*/ createKeylineIcon(DuotoneFileText, 'FileText');
export const ExternalLink = /*#__PURE__*/ createKeylineIcon(DuotoneSquareArrowOutUpRight, 'ExternalLink');
export const SquareArrowOutUpRight = ExternalLink;
export const Lock = /*#__PURE__*/ createKeylineIcon(DuotoneLock, 'Lock');
export const Unlock = /*#__PURE__*/ createKeylineIcon(DuotoneUnlock, 'Unlock');
export const KeyRound = /*#__PURE__*/ createKeylineIcon(DuotoneKeyRound, 'KeyRound');
export const Key = KeyRound;
export const LogOut = /*#__PURE__*/ createKeylineIcon(DuotoneLogOut, 'LogOut');
export const Language = /*#__PURE__*/ createKeylineIcon(DuotoneLanguage, 'Language');
export const Languages = Language;
export const Scissors = /*#__PURE__*/ createKeylineIcon(DuotoneScissors, 'Scissors');
export const Shirt = /*#__PURE__*/ createKeylineIcon(DuotoneShirt, 'Shirt');
export const Hanger = /*#__PURE__*/ createKeylineIcon(DuotoneHanger, 'Hanger');
export const ShoppingBag = /*#__PURE__*/ createKeylineIcon(DuotoneShoppingBag, 'ShoppingBag');
export const ClipboardCheck = /*#__PURE__*/ createKeylineIcon(DuotoneClipboardCheck, 'ClipboardCheck');
export const Search = /*#__PURE__*/ createKeylineIcon(DuotoneSearch, 'Search');
export const CornerDownLeft = /*#__PURE__*/ createKeylineIcon(DuotoneCornerDownLeft, 'CornerDownLeft');

// Telemetry, Power & Physics
export const Zap = /*#__PURE__*/ createKeylineIcon(DuotoneZap, 'Zap');
export const Lightning = Zap;
export const Gauge = /*#__PURE__*/ createKeylineIcon(DuotoneGauge, 'Gauge');
export const Scale = /*#__PURE__*/ createKeylineIcon(DuotoneScale, 'Scale');
export const Scales = Scale;
export const Flame = /*#__PURE__*/ createKeylineIcon(DuotoneFlame, 'Flame');
export const Flame2 = /*#__PURE__*/ createKeylineIcon(DuotoneFlame2, 'Flame2');
export const HeartPulse = /*#__PURE__*/ createKeylineIcon(DuotoneHeartPulse, 'HeartPulse');
export const Pulse = HeartPulse;
export const Heartbeat = HeartPulse;
export const Shield = /*#__PURE__*/ createKeylineIcon(DuotoneShield, 'Shield');
export const ShieldCheck = /*#__PURE__*/ createKeylineIcon(DuotoneShieldCheck, 'ShieldCheck');
export const ShieldAlert = /*#__PURE__*/ createKeylineIcon(DuotoneShieldAlert, 'ShieldAlert');
export const ShieldWarning = ShieldAlert;
export const Clock = /*#__PURE__*/ createKeylineIcon(DuotoneClock, 'Clock');
export const Timer = /*#__PURE__*/ createKeylineIcon(DuotoneTimer, 'Timer');
export const TimerReset = /*#__PURE__*/ createKeylineIcon(DuotoneTimerReset, 'TimerReset');
export const AlarmClock = /*#__PURE__*/ createKeylineIcon(DuotoneAlarmClock, 'AlarmClock');
export const Alarm = AlarmClock;

// Route, Geo & Weather
export const Wind = /*#__PURE__*/ createKeylineIcon(DuotoneWind, 'Wind');
export const Navigation = /*#__PURE__*/ createKeylineIcon(DuotoneNavigation, 'Navigation');
export const NavigationArrow = Navigation;
export const Compass = /*#__PURE__*/ createKeylineIcon(DuotoneCompass, 'Compass');
export const Route = /*#__PURE__*/ createKeylineIcon(DuotoneRoute, 'Route');
export const Path = Route;
export const MountainSnow = /*#__PURE__*/ createKeylineIcon(DuotoneMountainSnow, 'MountainSnow');
export const Mountains = MountainSnow;
export const Mountain = MountainSnow;
export const MapPin = /*#__PURE__*/ createKeylineIcon(DuotoneMapPin, 'MapPin');
export const Map = /*#__PURE__*/ createKeylineIcon(DuotoneMap, 'Map');
export const MapTrifold = Map;
export const Cloud = /*#__PURE__*/ createKeylineIcon(DuotoneCloud, 'Cloud');
export const CloudArrowDown = /*#__PURE__*/ createKeylineIcon(DuotoneCloudDownload, 'CloudDownload');
export const CloudCheck = /*#__PURE__*/ createKeylineIcon(DuotoneCloudCheck, 'CloudCheck');
export const ShareNetwork = /*#__PURE__*/ createKeylineIcon(DuotoneShare, 'Share');
export const Clouds = /*#__PURE__*/ createKeylineIcon(DuotoneClouds, 'Clouds');
export const CloudFog = Clouds;
export const CloudRain = /*#__PURE__*/ createKeylineIcon(DuotoneCloudRain, 'CloudRain');
export const CloudSun = /*#__PURE__*/ createKeylineIcon(DuotoneCloudSun, 'CloudSun');
export const CloudMoon = /*#__PURE__*/ createKeylineIcon(DuotoneCloudMoon, 'CloudMoon');
export const CloudLightning = /*#__PURE__*/ createKeylineIcon(DuotoneCloudLightning, 'CloudLightning');
export const Snowflake = /*#__PURE__*/ createKeylineIcon(DuotoneSnowflake, 'Snowflake');
export const Umbrella = /*#__PURE__*/ createKeylineIcon(DuotoneUmbrella, 'Umbrella');
export const Sunset = /*#__PURE__*/ createKeylineIcon(DuotoneSunset, 'Sunset');
export const Sunrise = /*#__PURE__*/ createKeylineIcon(DuotoneSunrise, 'Sunrise');
export const SunHorizon = Sunrise;
export const Thermometer = /*#__PURE__*/ createKeylineIcon(DuotoneThermometer, 'Thermometer');
export const ThermometerSimple = Thermometer;
export const Droplet = /*#__PURE__*/ createKeylineIcon(DuotoneDroplet, 'Droplet');
export const Drop = Droplet;
export const Droplets = /*#__PURE__*/ createKeylineIcon(DuotoneDroplets, 'Droplets');
export const Waves = /*#__PURE__*/ createKeylineIcon(DuotoneWaves, 'Waves');
export const EyeOff = /*#__PURE__*/ createKeylineIcon(DuotoneEyeOff, 'EyeOff');
export const EyeSlash = EyeOff;
export const Flashlight = /*#__PURE__*/ createKeylineIcon(DuotoneFlashlight, 'Flashlight');
export const CircleAlert = /*#__PURE__*/ createKeylineIcon(DuotoneCircleAlert, 'CircleAlert');
export const WarningCircle = CircleAlert;
export const AlertCircle = CircleAlert;
export const TriangleAlert = /*#__PURE__*/ createKeylineIcon(DuotoneTriangleAlert, 'TriangleAlert');
export const Warning = TriangleAlert;

// Lifestyle, Commute & Nutrition
export const Briefcase = /*#__PURE__*/ createKeylineIcon(DuotoneBriefcase, 'Briefcase');
export const Luggage = /*#__PURE__*/ createKeylineIcon(DuotoneLuggage, 'Luggage');
export const Backpack = Luggage;
export const Package = /*#__PURE__*/ createKeylineIcon(DuotonePackage, 'Package');
export const Coffee = /*#__PURE__*/ createKeylineIcon(DuotoneCoffee, 'Coffee');
export const Utensils = /*#__PURE__*/ createKeylineIcon(DuotoneUtensils, 'Utensils');
export const ForkKnife = Utensils;
export const UtensilsCrossed = Utensils;
export const AppleLogo = /*#__PURE__*/ createKeylineIcon(DuotoneApple, 'AppleLogo');
export const Apple = AppleLogo;
export const Banana = /*#__PURE__*/ createKeylineIcon(DuotoneBanana, 'Banana');
export const Croissant = /*#__PURE__*/ createKeylineIcon(DuotoneCroissant, 'Croissant');
export const ThumbsUp = /*#__PURE__*/ createKeylineIcon(DuotoneThumbsUp, 'ThumbsUp');
export const Bottle = /*#__PURE__*/ createKeylineIcon(DuotoneBottle, 'Bottle');
export const Wine = Bottle;
export const Cookie = /*#__PURE__*/ createKeylineIcon(DuotoneCookie, 'Cookie');
export const Hamburger = /*#__PURE__*/ createKeylineIcon(DuotoneHamburger, 'Hamburger');
export const ShowerHead = /*#__PURE__*/ createKeylineIcon(DuotoneShowerHead, 'ShowerHead');
export const Shower = ShowerHead;
export const Bed = /*#__PURE__*/ createKeylineIcon(DuotoneBed, 'Bed');
export const BedDouble = /*#__PURE__*/ createKeylineIcon(DuotoneBedDouble, 'BedDouble');
export const Tent = /*#__PURE__*/ createKeylineIcon(DuotoneTent, 'Tent');
export const Buildings = /*#__PURE__*/ createKeylineIcon(DuotoneBuildings, 'Buildings');
export const Building = Buildings;
export const Building2 = Buildings;
export const Banknote = /*#__PURE__*/ createKeylineIcon(DuotoneBanknote, 'Banknote');
export const Bank = Banknote;
export const Landmark = Banknote;
export const Camera = /*#__PURE__*/ createKeylineIcon(DuotoneCamera, 'Camera');
export const Headphones = /*#__PURE__*/ createKeylineIcon(DuotoneHeadphones, 'Headphones');
export const User = /*#__PURE__*/ createKeylineIcon(DuotoneUser, 'User');
export const Users = /*#__PURE__*/ createKeylineIcon(DuotoneUsers, 'Users');
export const FaceSmile = /*#__PURE__*/ createKeylineIcon(DuotoneFaceSmile, 'FaceSmile');
export const Smiley = FaceSmile;
export const Smile = FaceSmile;
export const Sparkle = /*#__PURE__*/ createKeylineIcon(DuotoneSparkle, 'Sparkle');
export const Sparkles = Sparkle;
export const Trophy = /*#__PURE__*/ createKeylineIcon(DuotoneTrophy, 'Trophy');
export const Target = /*#__PURE__*/ createKeylineIcon(DuotoneTarget, 'Target');
export const Flag = /*#__PURE__*/ createKeylineIcon(DuotoneFlag, 'Flag');
export const FinishFlag = Flag;
export const BatteryCharging = /*#__PURE__*/ createKeylineIcon(DuotoneBatteryCharging, 'BatteryCharging');
export const Leaf = /*#__PURE__*/ createKeylineIcon(DuotoneLeaf, 'Leaf');
export const Feather = /*#__PURE__*/ createKeylineIcon(DuotoneFeather, 'Feather');
export const Rocket = /*#__PURE__*/ createKeylineIcon(DuotoneRocket, 'Rocket');
export const RocketLaunch = Rocket;
export const PencilRuler = /*#__PURE__*/ createKeylineIcon(DuotonePencilRuler, 'PencilRuler');
export const Ruler = PencilRuler;
export const Train = /*#__PURE__*/ createKeylineIcon(DuotoneTrain, 'Train');
export const TrainSimple = Train;
export const Wrench = /*#__PURE__*/ createKeylineIcon(DuotoneWrench, 'Wrench');
export const Calendar = /*#__PURE__*/ createKeylineIcon(DuotoneCalendar, 'Calendar');
export const CalendarDays = /*#__PURE__*/ createKeylineIcon(DuotoneCalendarDays, 'CalendarDays');
export const Clock3 = /*#__PURE__*/ createKeylineIcon(DuotoneClock3, 'Clock3');
export const HomeSmile = /*#__PURE__*/ createKeylineIcon(DuotoneHomeSmile, 'HomeSmile');
export const Home = /*#__PURE__*/ createKeylineIcon(DuotoneHome, 'Home');
export const Upload = /*#__PURE__*/ createKeylineIcon(DuotoneUpload, 'Upload');
export const FileArrowUp = Upload;
export const Eye = /*#__PURE__*/ createKeylineIcon(DuotoneEye, 'Eye');
export const OctagonX = /*#__PURE__*/ createKeylineIcon(DuotoneOctagonX, 'OctagonX');
export const CircleDashedCheck = /*#__PURE__*/ createKeylineIcon(DuotoneCircleDashedCheck, 'CircleDashedCheck');

// Keyline Rounded Duotone Icons:
export const Monitor2Check = /*#__PURE__*/ createKeylineIcon(DuotoneMonitor2Check, 'Monitor2Check');
export const MonitorCheck = Monitor2Check;
export const BikeFast = /*#__PURE__*/ createKeylineIcon(DuotoneBikeFast, 'BikeFast');
export const Receipt = /*#__PURE__*/ createKeylineIcon(DuotoneReceipt, 'Receipt');
export const CircleZap = /*#__PURE__*/ createKeylineIcon(DuotoneCircleZap, 'CircleZap');
export const HandClosed = /*#__PURE__*/ createKeylineIcon(DuotoneHandClosed, 'HandClosed');
export const CircleArrowUpRight = /*#__PURE__*/ createKeylineIcon(DuotoneCircleArrowUpRight, 'CircleArrowUpRight');
export const Settings = /*#__PURE__*/ createKeylineIcon(DuotoneSettings, 'Settings');
export const Bug = /*#__PURE__*/ createKeylineIcon(DuotoneBug, 'Bug');
export const Calculator = /*#__PURE__*/ createKeylineIcon(DuotoneCalculator, 'Calculator');
export const Lightbulb = /*#__PURE__*/ createKeylineIcon(DuotoneLightbulb, 'Lightbulb');
export const LightbulbSparkles = /*#__PURE__*/ createKeylineIcon(DuotoneLightbulbSparkles, 'LightbulbSparkles');
export const CircleUser = /*#__PURE__*/ createKeylineIcon(DuotoneCircleUser, 'CircleUser');
export const Mail = /*#__PURE__*/ createKeylineIcon(DuotoneMail, 'Mail');
export const Send = /*#__PURE__*/ createKeylineIcon(DuotoneSend, 'Send');
export const BookOpen2 = /*#__PURE__*/ createKeylineIcon(DuotoneBookOpen2, 'BookOpen2');
export const BookOpen = BookOpen2;

export const Skull = /*#__PURE__*/ createKeylineIcon(DuotoneSkull, 'Skull');
export const Cemetery = Skull;
export const Graveyard = Skull;
export const Radar = /*#__PURE__*/ createKeylineIcon(DuotoneRadar, 'Radar');
export const Baguette = /*#__PURE__*/ createKeylineIcon(DuotoneStore, 'Store');
export const Bakery = Baguette;
export const Star = /*#__PURE__*/ createKeylineIcon(DuotoneStar, 'Star');
export const Bookmark = Star;
export const Newspaper = /*#__PURE__*/ createKeylineIcon(DuotoneNewspaper, 'Newspaper');
export const Link2 = /*#__PURE__*/ createKeylineIcon(DuotoneLink2, 'Link2');
