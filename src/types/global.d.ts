declare global {
  interface Window {
    gapi?: unknown;
    google?: {
      picker?: unknown;
      accounts?: {
        id: {
          initialize: (config: { client_id: string; callback: (response: unknown) => void; }) => void;
          prompt: () => void;
        };
      };
    };
    Dropbox?: {
      choose: (options: {
        success: (files: DropboxFile[]) => void;
        cancel: () => void;
        linkType: "direct" | "preview";
        multiselect: boolean;
        extensions: string[];
        folderselect: boolean;
      }) => void;
    };
    __RECAPTCHA_SITE_KEY__?: string;
  }
}

export interface DropboxFile {
  id: string;
  name: string;
  link: string;
  bytes: number;
  icon: string;
  thumbnailLink?: string;
  isDir: boolean;
}

export {};