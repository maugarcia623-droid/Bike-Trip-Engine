import React, { createContext, useContext } from 'react';
import * as Duotone from '@keyline-icons/react/duotone';

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
    weight, // handled / swallowed for Phosphor/icon compatibility
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

// ── CUSTOM ROUNDED DUOTONE ICONS (DESIGN-GRID COMPLIANT, 0.4 TONE PLATE) ──
const CustomAppleSvg: React.FC<any> = ({ size = 24, className = '', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Apple fruit tone plate */}
    <path
      d="M12 21c-2.5 0-3.5-1-5-1s-3.5 1-5 1c-1.5 0-2-1.5-2-4C0 12.5 2 7 6.5 7c2 0 3 1.5 5.5 1.5s3.5-1.5 5.5-1.5c4.5 0 6.5 5.5 6.5 10 0 2.5-.5 4-2 4-1.5 0-3.5-1-5-1s-2.5 1-5 1z"
      fill="currentColor"
      fillOpacity={0.4}
      stroke="none"
    />
    {/* Apple outline */}
    <path d="M12 21c-2.5 0-3.5-1-5-1s-3.5 1-5 1c-1.5 0-2-1.5-2-4C0 12.5 2 7 6.5 7c2 0 3 1.5 5.5 1.5s3.5-1.5 5.5-1.5c4.5 0 6.5 5.5 6.5 10 0 2.5-.5 4-2 4-1.5 0-3.5-1-5-1s-2.5 1-5 1z" />
    {/* Stem and Leaf */}
    <path d="M12 7V3M12 3c2 0 4 1 5 3" />
  </svg>
);

const CustomCemeterySvg: React.FC<any> = ({ size = 24, className = '', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path
      d="M6 20V10a6 6 0 0 1 12 0v10H6z"
      fill="currentColor"
      fillOpacity={0.4}
      stroke="none"
    />
    <path d="M6 20V10a6 6 0 0 1 12 0v10" />
    <path d="M3 20h18" />
    <path d="M12 7v6M9.5 9.5h5" />
  </svg>
);

const CustomBaguetteSvg: React.FC<any> = ({ size = 24, className = '', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path
      d="M17.5 4.5a3 3 0 0 1 2.8 3.5c-.2.9-.8 1.8-1.5 2.5L6.5 21.5a3 3 0 0 1-4.2-4.2L14.5 5.8c.8-.8 1.9-1.3 3-1.3z"
      fill="currentColor"
      fillOpacity={0.4}
      stroke="none"
    />
    <path d="M17.5 4.5a3 3 0 0 1 2.8 3.5c-.2.9-.8 1.8-1.5 2.5L6.5 21.5a3 3 0 0 1-4.2-4.2L14.5 5.8c.8-.8 1.9-1.3 3-1.3z" />
    <path d="M8 15l2-2M11 12l2-2M14 9l2-2" />
  </svg>
);

// ── CORE APPLICATION ICONS (KEYLINE ICONS ROUNDED DUOTONE ONLY) ──

// Navigation & Actions
export const Bike = createKeylineIcon(Duotone.Bike, 'Bike');
export const Bicycle = Bike; // Phosphor alias
export const Sun = createKeylineIcon(Duotone.Sun, 'Sun');
export const Moon = createKeylineIcon(Duotone.Moon, 'Moon');
export const SlidersHorizontal = createKeylineIcon(Duotone.SlidersHorizontal, 'SlidersHorizontal');
export const Sliders = SlidersHorizontal;
export const Grid2x2 = createKeylineIcon(Duotone.Grid2x2, 'Grid2x2');
export const SquaresFour = Grid2x2;
export const Plus = createKeylineIcon(Duotone.Plus, 'Plus');
export const Minus = createKeylineIcon(Duotone.Minus, 'Minus');
export const X = createKeylineIcon(Duotone.X, 'X');
export const CircleX = createKeylineIcon(Duotone.CircleX, 'CircleX');
export const XCircle = CircleX;
export const Check = createKeylineIcon(Duotone.Check, 'Check');
export const CircleCheck = createKeylineIcon(Duotone.CircleCheck, 'CircleCheck');
export const CheckCircle = CircleCheck;
export const CheckCircle2 = CircleCheck;
export const SquareCheck = createKeylineIcon(Duotone.SquareCheck, 'SquareCheck');
export const CheckSquare = SquareCheck;
export const CircleChevronDown = createKeylineIcon(Duotone.CircleChevronDown, 'CircleChevronDown');
export const CircleChevronUp = createKeylineIcon(Duotone.CircleChevronUp, 'CircleChevronUp');
export const CircleChevronRight = createKeylineIcon(Duotone.CircleChevronRight, 'CircleChevronRight');
export const CaretDown = CircleChevronDown;
export const CaretUp = CircleChevronUp;
export const ChevronDown = CircleChevronDown;
export const ChevronUp = CircleChevronUp;
export const ChevronRight = createKeylineIcon(Duotone.ChevronRight, 'ChevronRight');
export const ArrowLeft = createKeylineIcon(Duotone.ArrowLeft, 'ArrowLeft');
export const ArrowRight = createKeylineIcon(Duotone.ArrowRight, 'ArrowRight');
export const ArrowUp = createKeylineIcon(Duotone.ArrowUp, 'ArrowUp');
export const ArrowDown = createKeylineIcon(Duotone.ArrowDown, 'ArrowDown');
export const ArrowUpRight = createKeylineIcon(Duotone.ArrowUpRight, 'ArrowUpRight');
export const RotateCcw = createKeylineIcon(Duotone.RotateCcw, 'RotateCcw');
export const ArrowCounterClockwise = RotateCcw;
export const RefreshCcw = createKeylineIcon(Duotone.RefreshCcw, 'RefreshCcw');
export const RefreshCw = createKeylineIcon(Duotone.RefreshCw, 'RefreshCw');
export const ArrowsClockwise = RefreshCcw;
export const ArrowRightLeft = createKeylineIcon(Duotone.ArrowRightLeft, 'ArrowRightLeft');
export const ArrowsLeftRight = ArrowRightLeft;
export const Printer = createKeylineIcon(Duotone.Printer, 'Printer');
export const List = createKeylineIcon(Duotone.List, 'List');
export const Copy = createKeylineIcon(Duotone.Copy, 'Copy');
export const Bin = createKeylineIcon(Duotone.Bin, 'Bin');
export const Trash = Bin;
export const Pen = createKeylineIcon(Duotone.Pen, 'Pen');
export const PencilSimple = Pen;
export const Save = createKeylineIcon(Duotone.Save, 'Save');
export const FloppyDisk = Save;
export const LoaderCircle = createKeylineIcon(Duotone.LoaderCircle, 'LoaderCircle');
export const Loader2 = LoaderCircle;
export const Loader = LoaderCircle;
export const SpinnerGap = LoaderCircle;
export const Info = createKeylineIcon(Duotone.Info, 'Info');
export const BadgeInfo = createKeylineIcon(Duotone.BadgeInfo, 'BadgeInfo');
export const Download = createKeylineIcon(Duotone.Download, 'Download');
export const Layers = createKeylineIcon(Duotone.Layers, 'Layers');
export const FileText = createKeylineIcon(Duotone.FileText, 'FileText');
export const ExternalLink = createKeylineIcon(Duotone.SquareArrowOutUpRight, 'ExternalLink');
export const SquareArrowOutUpRight = ExternalLink;
export const Lock = createKeylineIcon(Duotone.Lock, 'Lock');
export const KeyRound = createKeylineIcon(Duotone.KeyRound, 'KeyRound');
export const Key = KeyRound;
export const LogOut = createKeylineIcon(Duotone.LogOut, 'LogOut');
export const Language = createKeylineIcon(Duotone.Language, 'Language');
export const Languages = Language;

// Telemetry, Power & Physics
export const Zap = createKeylineIcon(Duotone.Zap, 'Zap');
export const Lightning = Zap;
export const Gauge = createKeylineIcon(Duotone.Gauge, 'Gauge');
export const Scale = createKeylineIcon(Duotone.Scale, 'Scale');
export const Scales = Scale;
export const Flame = createKeylineIcon(Duotone.Flame, 'Flame');
export const Flame2 = createKeylineIcon(Duotone.Flame2, 'Flame2');
export const HeartPulse = createKeylineIcon(Duotone.HeartPulse, 'HeartPulse');
export const Pulse = HeartPulse;
export const Heartbeat = HeartPulse;
export const Shield = createKeylineIcon(Duotone.Shield, 'Shield');
export const ShieldCheck = createKeylineIcon(Duotone.ShieldCheck, 'ShieldCheck');
export const ShieldAlert = createKeylineIcon(Duotone.ShieldAlert, 'ShieldAlert');
export const ShieldWarning = ShieldAlert;
export const Clock = createKeylineIcon(Duotone.Clock, 'Clock');
export const Timer = createKeylineIcon(Duotone.Timer, 'Timer');
export const AlarmClock = createKeylineIcon(Duotone.AlarmClock, 'AlarmClock');
export const Alarm = AlarmClock;

// Route, Geo & Weather
export const Wind = createKeylineIcon(Duotone.Wind, 'Wind');
export const Navigation = createKeylineIcon(Duotone.Navigation, 'Navigation');
export const NavigationArrow = Navigation;
export const Compass = createKeylineIcon(Duotone.Compass, 'Compass');
export const Route = createKeylineIcon(Duotone.Route, 'Route');
export const Path = Route;
export const MountainSnow = createKeylineIcon(Duotone.MountainSnow, 'MountainSnow');
export const Mountains = MountainSnow;
export const Mountain = MountainSnow;
export const MapPin = createKeylineIcon(Duotone.MapPin, 'MapPin');
export const Map = createKeylineIcon(Duotone.Map, 'Map');
export const MapTrifold = Map;
export const Cloud = createKeylineIcon(Duotone.Cloud, 'Cloud');
export const Clouds = createKeylineIcon(Duotone.Clouds, 'Clouds');
export const CloudFog = Clouds;
export const CloudRain = createKeylineIcon(Duotone.CloudRain, 'CloudRain');
export const CloudSun = createKeylineIcon(Duotone.CloudSun, 'CloudSun');
export const Sunrise = createKeylineIcon(Duotone.Sunrise, 'Sunrise');
export const SunHorizon = Sunrise;
export const Thermometer = createKeylineIcon(Duotone.Thermometer, 'Thermometer');
export const ThermometerSimple = Thermometer;
export const Droplet = createKeylineIcon(Duotone.Droplet, 'Droplet');
export const Drop = Droplet;
export const Droplets = createKeylineIcon(Duotone.Droplets, 'Droplets');
export const Waves = createKeylineIcon(Duotone.Waves, 'Waves');
export const EyeOff = createKeylineIcon(Duotone.EyeOff, 'EyeOff');
export const EyeSlash = EyeOff;
export const Flashlight = createKeylineIcon(Duotone.Flashlight, 'Flashlight');
export const CircleAlert = createKeylineIcon(Duotone.CircleAlert, 'CircleAlert');
export const WarningCircle = CircleAlert;
export const AlertCircle = CircleAlert;
export const TriangleAlert = createKeylineIcon(Duotone.TriangleAlert, 'TriangleAlert');
export const Warning = TriangleAlert;

// Lifestyle, Commute & Nutrition
export const Briefcase = createKeylineIcon(Duotone.Briefcase, 'Briefcase');
export const Luggage = createKeylineIcon(Duotone.Luggage, 'Luggage');
export const Backpack = Luggage;
export const Package = createKeylineIcon(Duotone.Package, 'Package');
export const Coffee = createKeylineIcon(Duotone.Coffee, 'Coffee');
export const Utensils = createKeylineIcon(Duotone.Utensils, 'Utensils');
export const ForkKnife = Utensils;
export const UtensilsCrossed = Utensils;
export const AppleLogo = createKeylineIcon(CustomAppleSvg, 'AppleLogo');
export const Apple = AppleLogo;
export const Bottle = createKeylineIcon(Duotone.Bottle, 'Bottle');
export const Wine = Bottle;
export const Cookie = createKeylineIcon(Duotone.Cookie, 'Cookie');
export const Hamburger = createKeylineIcon(Duotone.Hamburger, 'Hamburger');
export const ShowerHead = createKeylineIcon(Duotone.ShowerHead, 'ShowerHead');
export const Shower = ShowerHead;
export const Bed = createKeylineIcon(Duotone.Bed, 'Bed');
export const Tent = createKeylineIcon(Duotone.Tent, 'Tent');
export const Buildings = createKeylineIcon(Duotone.Buildings, 'Buildings');
export const Building = Buildings;
export const Building2 = Buildings;
export const Banknote = createKeylineIcon(Duotone.Banknote, 'Banknote');
export const Bank = Banknote;
export const Landmark = Banknote;
export const Camera = createKeylineIcon(Duotone.Camera, 'Camera');
export const Headphones = createKeylineIcon(Duotone.Headphones, 'Headphones');
export const User = createKeylineIcon(Duotone.User, 'User');
export const Users = createKeylineIcon(Duotone.Users, 'Users');
export const FaceSmile = createKeylineIcon(Duotone.FaceSmile, 'FaceSmile');
export const Smiley = FaceSmile;
export const Smile = FaceSmile;
export const Sparkle = createKeylineIcon(Duotone.Sparkle, 'Sparkle');
export const Sparkles = Sparkle;
export const Trophy = createKeylineIcon(Duotone.Trophy, 'Trophy');
export const Target = createKeylineIcon(Duotone.Target, 'Target');
export const Flag = createKeylineIcon(Duotone.Flag, 'Flag');
export const FinishFlag = Flag;
export const BatteryCharging = createKeylineIcon(Duotone.BatteryCharging, 'BatteryCharging');
export const Leaf = createKeylineIcon(Duotone.Leaf, 'Leaf');
export const Feather = createKeylineIcon(Duotone.Feather, 'Feather');
export const Rocket = createKeylineIcon(Duotone.Rocket, 'Rocket');
export const RocketLaunch = Rocket;
export const PencilRuler = createKeylineIcon(Duotone.PencilRuler, 'PencilRuler');
export const Ruler = PencilRuler;
export const Train = createKeylineIcon(Duotone.Train, 'Train');
export const TrainSimple = Train;
export const Wrench = createKeylineIcon(Duotone.Wrench, 'Wrench');
export const Calendar = createKeylineIcon(Duotone.Calendar, 'Calendar');
export const HomeSmile = createKeylineIcon(Duotone.HomeSmile, 'HomeSmile');
export const Home = createKeylineIcon(Duotone.Home, 'Home');
export const Upload = createKeylineIcon(Duotone.Upload, 'Upload');
export const FileArrowUp = Upload;
export const Eye = createKeylineIcon(Duotone.Eye, 'Eye');

// Keyline Rounded Duotone Icons:
export const Monitor2Check = createKeylineIcon(Duotone.Monitor2Check, 'Monitor2Check');
export const MonitorCheck = Monitor2Check;
export const BikeFast = createKeylineIcon(Duotone.BikeFast, 'BikeFast');
export const Receipt = createKeylineIcon(Duotone.Receipt, 'Receipt');
export const CircleZap = createKeylineIcon(Duotone.CircleZap, 'CircleZap');
export const HandClosed = createKeylineIcon(Duotone.HandClosed, 'HandClosed');
export const CircleArrowUpRight = createKeylineIcon(Duotone.CircleArrowUpRight, 'CircleArrowUpRight');
export const Settings = createKeylineIcon(Duotone.Settings, 'Settings');
export const Bug = createKeylineIcon(Duotone.Bug, 'Bug');
export const Calculator = createKeylineIcon(Duotone.Calculator, 'Calculator');
export const Lightbulb = createKeylineIcon(Duotone.Lightbulb, 'Lightbulb');
export const LightbulbSparkles = createKeylineIcon(Duotone.LightbulbSparkles, 'LightbulbSparkles');
export const CircleUser = createKeylineIcon(Duotone.CircleUser, 'CircleUser');
export const Mail = createKeylineIcon(Duotone.Mail, 'Mail');
export const Send = createKeylineIcon(Duotone.Send, 'Send');
export const BookOpen2 = createKeylineIcon(Duotone.BookOpen2, 'BookOpen2');
export const BookOpen = BookOpen2;

export const Cemetery = createKeylineIcon(CustomCemeterySvg, 'Cemetery');
export const Graveyard = Cemetery;
export const Radar = createKeylineIcon(Duotone.Radar, 'Radar');
export const Baguette = createKeylineIcon(CustomBaguetteSvg, 'Baguette');
export const Bakery = Baguette;
export const Star = createKeylineIcon(Duotone.Star, 'Star');
export const Bookmark = Star;

export default {
  Bike,
  Bicycle,
  HomeSmile,
  Home,
  Monitor2Check,
  MonitorCheck,
  BikeFast,
  Receipt,
  Flame2,
  CircleZap,
  HandClosed,
  CircleArrowUpRight,
  Settings,
  CloudSun,
  Bug,
  Calculator,
  Lightbulb,
  LightbulbSparkles,
  CircleUser,
  Mail,
  Send,
  BookOpen2,
  BookOpen,
  CircleChevronDown,
  CircleChevronUp,
  CircleChevronRight,
  Flag,
  FinishFlag,
  Sun,
  Moon,
  SlidersHorizontal,
  Sliders,
  Grid2x2,
  SquaresFour,
  Plus,
  Minus,
  X,
  CircleX,
  XCircle,
  Check,
  CircleCheck,
  CheckCircle,
  CheckCircle2,
  SquareCheck,
  CheckSquare,
  CaretDown,
  CaretUp,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  RotateCcw,
  ArrowCounterClockwise,
  RefreshCcw,
  RefreshCw,
  ArrowsClockwise,
  ArrowRightLeft,
  ArrowsLeftRight,
  Printer,
  List,
  Copy,
  Bin,
  Trash,
  Pen,
  PencilSimple,
  Save,
  FloppyDisk,
  LoaderCircle,
  Loader2,
  Loader,
  SpinnerGap,
  Info,
  BadgeInfo,
  Download,
  Layers,
  FileText,
  ExternalLink,
  SquareArrowOutUpRight,
  Lock,
  KeyRound,
  Key,
  LogOut,
  Language,
  Languages,
  Zap,
  Lightning,
  Gauge,
  Scale,
  Scales,
  Flame,
  HeartPulse,
  Pulse,
  Heartbeat,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldWarning,
  Clock,
  Timer,
  AlarmClock,
  Alarm,
  Wind,
  Navigation,
  NavigationArrow,
  Compass,
  Route,
  Path,
  MountainSnow,
  Mountains,
  Mountain,
  MapPin,
  Map,
  MapTrifold,
  Cloud,
  Clouds,
  CloudFog,
  CloudRain,
  Sunrise,
  SunHorizon,
  Thermometer,
  ThermometerSimple,
  Droplet,
  Drop,
  Droplets,
  Waves,
  EyeOff,
  EyeSlash,
  Flashlight,
  CircleAlert,
  WarningCircle,
  AlertCircle,
  TriangleAlert,
  Warning,
  Briefcase,
  Luggage,
  Backpack,
  Package,
  Coffee,
  ForkKnife,
  Utensils,
  UtensilsCrossed,
  AppleLogo,
  Apple,
  Bottle,
  Wine,
  Cookie,
  Hamburger,
  ShowerHead,
  Shower,
  Bed,
  Tent,
  Buildings,
  Building,
  Building2,
  Banknote,
  Bank,
  Landmark,
  Camera,
  Headphones,
  User,
  Users,
  FaceSmile,
  Smiley,
  Smile,
  Sparkle,
  Sparkles,
  Trophy,
  Target,
  BatteryCharging,
  Leaf,
  Feather,
  Rocket,
  RocketLaunch,
  PencilRuler,
  Ruler,
  Train,
  TrainSimple,
  Wrench,
  Calendar,
  Upload,
  FileArrowUp,
  Eye,
  Cemetery,
  Graveyard,
  Radar,
  Baguette,
  Bakery,
  Star,
  Bookmark,
};
