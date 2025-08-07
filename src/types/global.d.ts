declare global {
  interface Window {
    gapi?: any;
    google?: {
      picker?: any;
      accounts?: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
        };
      };
    };
    Dropbox?: {
      choose: (options: any) => void;
    };
  }
}

export {};