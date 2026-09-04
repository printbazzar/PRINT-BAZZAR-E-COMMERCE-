// src/routes/productRoutes.js
import {StandardCardDetails} from "../ProductDetails/StandardCardDetails";
import { LaminatedCardDetails } from "../ProductDetails/LaminatedCardDetails";
import { EconomicalCardDetails } from "../ProductDetails/EconomicalCardDetails";
import { TexturedCardDetails } from "../ProductDetails/TexturedCardDetails";
import { SquareCardDetails } from "../ProductDetails/SquareCardDetails";
import { MetallicCardDetails } from "../ProductDetails/MetallicCardDetails";
import { FoilCardDetails } from "../ProductDetails/FoilCardDetails";
import { RaisedUVCardDetails } from "../ProductDetails/RaisedUVCardDetails";
import { SpotUVCardDetails } from "../ProductDetails/SpotUVCardDetails";
import { SyntheticCardDetails } from "../ProductDetails/SyntheticCardDetails";
import { BulkSyntheticCardDetails } from "../ProductDetails/BulkSyntheticCardDetails";
import { PremiumSpotUVCardDetails } from "../ProductDetails/PremiumSpotUVCardDetails";
import { DieCuttingCardDetails } from "../ProductDetails/DieCuttingCardDetails";
import { TranslucentCardDetails } from "../ProductDetails/TranslucentCardDetails";
import { PerfumedCardDetails } from "../ProductDetails/PerfumedCardDetails";
import { PlantablePaperCardDetails } from "../ProductDetails/PlantablePaperCardDetails";
import { LetterHeadDetails } from "../ProductDetails/LetterHeadDetails";
import { BillBookDetails } from "../ProductDetails/BillBookDetails";
import { BulkBillBookDetails } from "../ProductDetails/BulkBillBookDetails";
import { EnvelopeCoversDetails } from "../ProductDetails/EnvelopeCoversDetails";
import { BulkEnvelopeCoversDetails } from "../ProductDetails/BulkEnvelopeCoversDetails";
import { IDCardsSetDetails } from "../ProductDetails/IDCardsSetDetails";
import { LanyardsDetails } from "../ProductDetails/LanyardsDetails";
import { IDCardDetails } from "../ProductDetails/IDCardDetails";
import { PremiumCertificatesDetails } from "../ProductDetails/PremiumCertificatesDetails";
import { StandardCertificatesDetails } from "../ProductDetails/StandardCertificatesDetails";
import { LaminatedCertificatesDetails } from "../ProductDetails/LaminatedCertificatesDetails";
import { FramedCertificatesDetails } from "../ProductDetails/FramedCertificatesDetails";
import { BulkCertificatesDetails } from "../ProductDetails/BulkCertificatesDetails";
import { NotePadDetails } from "../ProductDetails/NotePadDetails";
import { BrochuresDetails } from "../ProductDetails/BrochuresDetails";
import { BulkBrochuresDetails } from "../ProductDetails/BulkBrochuresDetails";
import { SingleColorFlyersDetails } from "../ProductDetails/SingleColorFlyersDetails";
import { A4MultiColorFlyersDetails } from "../ProductDetails/A4MultiColorFlyersDetails";
import { A3MultiColorFlyersDetails } from "../ProductDetails/A3MultiColorFlyersDetails";
import { RollupStandeeDetails } from "../ProductDetails/RollupStandeeDetails";
import { SunpackPrintingDetails } from "../ProductDetails/SunpackPrintingDetails";
import { PouchLaminatedBoardDetails } from "../ProductDetails/PouchLaminatedBoard";
import { FoamBoardsDetails } from "../ProductDetails/FoamBoardsDetails";
import { MiniQRStandDetails } from "../ProductDetails/MiniQRStandDetails";
import { MenuCardDetails } from "../ProductDetails/MenuCardDetails";
import { BannersDetails } from "../ProductDetails/BannersDetails";
import { LargeFormatStickersDetails } from "../ProductDetails/LargeFormatStickersDetails";
import { CustomShapeStickersDetails } from "../ProductDetails/CustomShapeStickers";
import { CircleStickersDetails } from "../ProductDetails/CircleStickersDetails";
import { OvalStickersDetails } from "../ProductDetails/OvalStickersDetails";
import { RoundCornerStickersDetails } from "../ProductDetails/RoundCornerStickersDetails";
import { EnvelopeLabelDetails } from "../ProductDetails/EnvelopeLabelDetails";
import { BottleandJarLabelDetails } from "../ProductDetails/BottleandJarLabelDetails";
import { ProductLabelDetails } from "../ProductDetails/ProductLabelDetails";
import { SizeandPriceLabelDetails } from "../ProductDetails/SizeandPriceLabelDetails";
import { WarningLabelDetails } from "../ProductDetails/WarningLabelDetails";
import { WarrantyLabelDetails } from "../ProductDetails/WarrantyLabelDetails";
import { SquareStickersDetails } from "../ProductDetails/SquareStickersDetails";
import { SingleColorLetterHeadDetails } from "../ProductDetails/SingleColorLetterHeadDetails";
import { A5LetterHeadDetails } from "../ProductDetails/A5LetterHeadDetails";
import { PrescriptionPadDetails } from "../ProductDetails/PrescriptionPadDetails";
import { RectangleStickersDetails } from "../ProductDetails/RectangleStickersDetails";
import { PackagingLabelsDetails } from "../ProductDetails/PackagingLabelsDetails";
import { UVInkTransferStickersDetails } from "../ProductDetails/UVInkTransferStickersDetails";
import { EventIDCardDetails } from "../ProductDetails/EventIDCardDetails";
import { VolunteerIDCardDetails } from "../ProductDetails/VolunteerIDCardDetails";
import { IDCardRetractorDetails } from "../ProductDetails/IDCardRetractorDetails";
import { DanglersDetails } from "../ProductDetails/DanglersDetails";
import { ContainerLabelsDetails } from "../ProductDetails/ContainerLabelsDetails";
import { PouchLabelsDetails } from "../ProductDetails/PouchLabelsDetails";
import { BusinessInvitationDetails } from "../ProductDetails/BusinessInvitationDetails";
import { BirthdayInvitationDetails } from "../ProductDetails/BirthdayInvitationDetails";
import { WeddingInvitationDetails } from "../ProductDetails/WeddingInvitationDetails";
import { BabyShowerInvitationDetails } from "../ProductDetails/BabyShowerInvitationDetails";
import { EngagementInvitationDetails } from "../ProductDetails/EngagementInvitationDetails";
import { PubertyInvitationDetails } from "../ProductDetails/PubertyInvitationDetails";
import { HaldiInvitationDetails } from "../ProductDetails/HaldiInvitationDetails";
import { NamingCeremonyInvitationDetails } from "../ProductDetails/NamingCeremonyInvitationDetails";
import { EventInvitationDetails } from "../ProductDetails/EventInvitationDetails";
import { HouseWarmingInvitationDetails } from "../ProductDetails/HouseWarmingInvitationDetails";
import { OtherSpecialOccasionsInvitationDetails } from "../ProductDetails/OtherSpecialOccasionsDetails";
import { GreetingCardsDetails } from "../ProductDetails/GreetingCardsDetails";
import { ThankYouCardsDetails } from "../ProductDetails/ThankYouCardsDetails";
import { NameBadgesDetails } from "../ProductDetails/NameBadgesDetails";
import { ViboothiCoverSingleColorDetails } from "../ProductDetails/ViboothiCoverSingleColorDetails.jsx";
import { WristBandsDetails } from "../ProductDetails/WristBandsDetails.jsx";
import { PhotoBoothDetails } from "../ProductDetails/PhotoBoothDetails.jsx";
import { ViboothiCoverMultiColorDetails } from "../ProductDetails/ViboothiCoverMultiColorDetails.jsx";
import { BookletDetails } from "../ProductDetails/BookletDetails.jsx";
import { GiftVoucherDetails } from "../ProductDetails/GiftVoucherDetails.jsx";
import { A5MultiColorFlyersDetails } from "../ProductDetails/A5MultiColorFlyersDetails.jsx";

const productRoutes = [
  { path: "/StandardCardDetails", element: <StandardCardDetails /> },
  { path: "/LaminatedCardDetails", element: <LaminatedCardDetails /> },
  { path: "/EconomicalCardDetails", element: <EconomicalCardDetails /> },
  { path: "/TexturedCardDetails", element: <TexturedCardDetails /> },
  { path: "/SquareCardDetails", element: <SquareCardDetails /> },
  { path: "/MetallicCardDetails", element: <MetallicCardDetails /> },
  { path: "/FoilCardDetails", element: <FoilCardDetails /> },
  { path: "/RaisedUVCardDetails", element: <RaisedUVCardDetails /> },
  { path: "/SpotUVCardDetails", element: <SpotUVCardDetails /> },
  { path: "/SyntheticCardDetails", element: <SyntheticCardDetails /> },
  { path: "/BulkSyntheticCardDetails", element: <BulkSyntheticCardDetails /> },
  { path: "/PremiumSpotUVCardDetails", element: <PremiumSpotUVCardDetails /> },
  { path: "/DieCuttingCardDetails", element: <DieCuttingCardDetails /> },
  { path: "/TranslucentCardDetails", element: <TranslucentCardDetails /> },
  { path: "/PerfumedCardDetails", element: <PerfumedCardDetails /> },
  { path: "/PlantablePaperCardDetails", element: <PlantablePaperCardDetails /> },
  { path: "/LetterHeadDetails", element: <LetterHeadDetails /> },
  { path: "/SingleColorLetterHeadDetails", element: <SingleColorLetterHeadDetails /> },
  { path: "/PrescriptionPadDetails", element: <PrescriptionPadDetails /> },
  { path: "/A5LetterHeadDetails", element: <A5LetterHeadDetails /> },
  { path: "/BillBookDetails", element: <BillBookDetails /> }, 
  { path: "/BulkBillBookDetails", element: <BulkBillBookDetails /> }, 
  { path: "/EnvelopeCoversDetails", element: <EnvelopeCoversDetails /> }, 
  { path: "/BulkEnvelopeCoversDetails", element: <BulkEnvelopeCoversDetails /> }, 
  { path: "/IDCardsSetDetails", element: <IDCardsSetDetails /> }, 
  { path: "/LanyardsDetails", element: <LanyardsDetails /> }, 
  { path: "/IDCardDetails", element: <IDCardDetails /> }, 
  { path: "/StandardCertificatesDetails", element: <StandardCertificatesDetails/> }, 
  { path: "/PremiumCertificatesDetails", element: <PremiumCertificatesDetails /> }, 
  { path: "/LaminatedCertificatesDetails", element: <LaminatedCertificatesDetails /> }, 
  { path: "/FramedCertificatesDetails", element: <FramedCertificatesDetails /> }, 
  { path: "/BulkCertificatesDetails", element: <BulkCertificatesDetails /> }, 
  { path: "/NotePadDetails", element: <NotePadDetails /> }, 
  { path: "/BrochuresDetails", element: <BrochuresDetails /> }, 
  { path: "/BulkBrochuresDetails", element: <BulkBrochuresDetails /> }, 
  { path: "/SingleColorFlyersDetails", element: <SingleColorFlyersDetails /> }, 
  { path: "/A3MultiColorFlyersDetails", element: <A3MultiColorFlyersDetails /> }, 
  { path: "/RollupStandeeDetails", element: <RollupStandeeDetails /> }, 
  { path: "/SunpackPrintingDetails", element: <SunpackPrintingDetails /> }, 
  { path: "/PouchLaminatedBoardDetails", element: <PouchLaminatedBoardDetails /> }, 
  { path: "/FoamBoardsDetails", element: <FoamBoardsDetails /> }, 
  { path: "/MiniQRStandDetails", element: <MiniQRStandDetails /> }, 
  { path: "/MenuCardDetails", element: <MenuCardDetails /> }, 
  { path: "/BannersDetails", element: <BannersDetails /> }, 
  { path: "/LargeFormatStickersDetails", element: <LargeFormatStickersDetails /> }, 
  { path: "/CustomShapeStickersDetails", element: <CustomShapeStickersDetails /> }, 
  { path: "/CircleStickersDetails", element: <CircleStickersDetails /> }, 
  { path: "/OvalStickersDetails", element: <OvalStickersDetails /> }, 
  { path: "/RoundCornerStickersDetails", element: <RoundCornerStickersDetails /> }, 
  { path: "/SquareStickersDetails", element: <SquareStickersDetails /> }, 
  { path: "/EnvelopeLabelDetails", element: <EnvelopeLabelDetails /> }, 
  { path: "/BottleandJarLabelDetails", element: <BottleandJarLabelDetails /> }, 
  { path: "/ProductLabelDetails", element: <ProductLabelDetails /> }, 
  { path: "/SizeandPriceLabelDetails", element: <SizeandPriceLabelDetails /> }, 
  { path: "/WarrantyLabelDetails", element: <WarrantyLabelDetails /> }, 
  { path: "/WarningLabelDetails", element: <WarningLabelDetails /> }, 
  { path: "/RectangleStickersDetails", element: <RectangleStickersDetails /> }, 
  { path: "/UVInkTransferStickersDetails", element: <UVInkTransferStickersDetails /> }, 
  { path: "/PackagingLabelsDetails", element: <PackagingLabelsDetails /> }, 
  { path: "/EventIDCardDetails", element: <EventIDCardDetails /> }, 
  { path: "/VolunteerIDCardDetails", element: <VolunteerIDCardDetails /> }, 
  { path: "/IDCardRetractorDetails", element: <IDCardRetractorDetails /> }, 
  { path: "/DanglersDetails", element: <DanglersDetails /> }, 
  { path: "/ContainerLabelsDetails", element: <ContainerLabelsDetails /> }, 
  { path: "/PouchLabelsDetails", element: <PouchLabelsDetails /> }, 
  { path: "/BusinessInvitationDetails", element: <BusinessInvitationDetails /> }, 
  { path: "/BirthdayInvitationDetails", element: <BirthdayInvitationDetails /> }, 
  { path: "/WeddingInvitationDetails", element: <WeddingInvitationDetails /> }, 
  { path: "/BabyShowerInvitationDetails", element: <BabyShowerInvitationDetails /> }, 
  { path: "/EngagementInvitationDetails", element: <EngagementInvitationDetails /> }, 
  { path: "/PubertyInvitationDetails", element: <PubertyInvitationDetails /> }, 
  { path: "/HaldiInvitationDetails", element: <HaldiInvitationDetails /> }, 
  { path: "/NamingCeremonyInvitationDetails", element: <NamingCeremonyInvitationDetails /> }, 
  { path: "/EventInvitationDetails", element: <EventInvitationDetails /> }, 
  { path: "/HouseWarmingInvitationDetails", element: <HouseWarmingInvitationDetails /> }, 
  { path: "/OtherSpecialOccasionsInvitationDetails", element: <OtherSpecialOccasionsInvitationDetails /> }, 
  { path: "/GreetingCardsDetails", element: <GreetingCardsDetails /> }, 
  { path: "/ThankYouCardsDetails", element: <ThankYouCardsDetails /> }, 
  { path: "/NameBadgesDetails", element: <NameBadgesDetails /> }, 
  { path: "/ViboothiCoverSingleColorDetails", element: <ViboothiCoverSingleColorDetails /> }, 
  { path: "/ViboothiCoverMultiColorDetails", element: <ViboothiCoverMultiColorDetails /> }, 
  { path: "/WristBandsDetails", element: <WristBandsDetails /> }, 
  { path: "/PhotoBoothDetails", element: <PhotoBoothDetails /> }, 
  { path: "/BookletDetails", element: <BookletDetails /> }, 
  { path: "/GiftVoucherDetails", element: <GiftVoucherDetails /> }, 
  { path: "/A4MultiColorFlyersDetails", element: <A4MultiColorFlyersDetails /> }, 
  { path: "/A5MultiColorFlyersDetails", element: <A5MultiColorFlyersDetails /> }, 
];

export default productRoutes;
