declare module 'fabric-network' {
  export class Gateway {
    connect(connectionProfile: any, connectionOptions: any): Promise<void>;
    disconnect(): void;
    getNetwork(channelName: string): Promise<Network>;
  }

  export class Network {
    getContract(chaincodeName: string): Contract;
  }

  export class Contract {
    submitTransaction(functionName: string, ...args: string[]): Promise<Buffer>;
    evaluateTransaction(functionName: string, ...args: string[]): Promise<Buffer>;
  }

  export class Wallet {
    put(label: string, identity: any): Promise<void>;
    get(label: string): Promise<any>;
    exists(label: string): Promise<boolean>;
  }

  export class FileSystemWallet extends Wallet {
    constructor(path: string);
  }

  export class X509WalletMixin {
    static createIdentity(mspId: string, certificate: string, privateKey: string): Promise<any>;
  }
} 