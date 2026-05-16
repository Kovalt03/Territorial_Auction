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
}

export interface MyBidsResponse {
  totalCount: number;
  page: number;
  size: number;
  bids: MyBidEntry[];
}
