import { Language } from '@/types';
export declare const SUPPORTED_LANGUAGES: {
    [key: string]: Language;
};
export declare const getLanguageById: (id: string) => Language | undefined;
export declare const getSupportedLanguages: () => Language[];
export declare const isLanguageSupported: (id: string) => boolean;
export declare const getDefaultCode: (languageId: string) => string;
export declare const getFileName: (languageId: string, className?: string) => string;
export declare const extractClassName: (code: string, languageId: string) => string | undefined;
//# sourceMappingURL=index.d.ts.map