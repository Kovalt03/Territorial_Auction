export interface BidEntry {
  price: number;
  bidAt: string;
  bidderNickname: string | null;
}

export interface AuctionBidsResponse {
  auctionId: number;
  bids: BidEntry[];
}

export interface PlaceBidResponse {
  auctionId: number;
  newPrice: number;
  endAt: string;
}

export interface MyBidEntry {
  auctionId: number;
  territoryId: number;
  coordX: number;
  coordY: number;
  myBidAmount: number;
  currentPrice: number;
  isHighestBidder: boolean;
  endAt: string;
  status: string;
  grade: string;
  continentName: string;
}

export interface AuctionBidBroadcast {
  auctionId: number;
  currentPrice: number;
  bidderId: number;
  bidderNickname: string;
  bidAt: string;
  endAt: string;
}

export interface MyBidsResponse {
  totalCount: number;
  page: number;
  size: number;
  bids: MyBidEntry[];
}
