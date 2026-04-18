
import { Document } from 'langchain';

import type { MimeString } from '@freehour/mime';
import { Mime } from '@freehour/mime';
import type { ClientServerOptions, ColumnName, DefaultClientOptions, FileRef, FunctionName, GenericDatabase, JsonObject, OmitFrom, SchemaName, StorageLocation, TableDataService, TableName } from '@freehour/supabase-core';
import { DatabaseService, FileNotSupportedError, StorageService } from '@freehour/supabase-core';
import { JSONLinesLoader, JSONLoader } from '@langchain/classic/document_loaders/fs/json';
import { TextLoader } from '@langchain/classic/document_loaders/fs/text';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { EPubLoader } from '@langchain/community/document_loaders/fs/epub';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { PPTXLoader } from '@langchain/community/document_loaders/fs/pptx';
import { SRTLoader } from '@langchain/community/document_loaders/fs/srt';
import type { SupabaseFilterRPCCall } from '@langchain/community/vectorstores/supabase';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import type { DocumentLoader } from '@langchain/core/document_loaders/base';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type { BaseRetrieverInterface } from '@langchain/core/retrievers';
import type { VectorStoreRetrieverInput } from '@langchain/core/vectorstores';
import type { SupportedTextSplitterLanguage, TextSplitterParams } from '@langchain/textsplitters';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database as LangChainDatabase } from './generated/database';
import type { FileMetadata, MetadataGeneratorFn, StorageDocument } from './document';


export type RetriverOptions<
    BucketName extends string,
    Metadata extends JsonObject = JsonObject,
> = OmitFrom<VectorStoreRetrieverInput<SupabaseVectorStore>, 'vectorStore' | 'filter'> & {
    filter?: SupabaseFilterRPCCall | Partial<StorageLocation<BucketName> & FileMetadata & Metadata>;
};

export interface EmbeddingServiceParams<
    Database extends GenericDatabase<SchemaName<Database>> & LangChainDatabase = LangChainDatabase,
    ClientOptions extends Required<ClientServerOptions> = DefaultClientOptions<Database>,
> {
    embeddings: EmbeddingsInterface;
    supabase: SupabaseClient<Database, ClientOptions>;
    chunkSize?: number;
    chunkOverlap?: number;
}

export class EmbeddingService<
    Database extends GenericDatabase<SchemaName<Database>> & LangChainDatabase = LangChainDatabase,
    ClientOptions extends Required<ClientServerOptions> = DefaultClientOptions<Database>,
    BucketName extends string = string,
    Metadata extends JsonObject = JsonObject,
> {

    private readonly database: DatabaseService<LangChainDatabase>;
    private readonly storage: StorageService<BucketName>;
    private readonly vectorStore: SupabaseVectorStore;
    private readonly splitterOptions: Partial<TextSplitterParams>;

    constructor({
        supabase,
        embeddings,
        chunkSize = 1000,
        chunkOverlap = 200,
    }: EmbeddingServiceParams<Database, ClientOptions>) {
        this.database = new DatabaseService({ supabase }) as unknown as DatabaseService<LangChainDatabase>;
        this.storage = new StorageService<BucketName>({ client: supabase.storage, database: this.database });
        this.vectorStore = new SupabaseVectorStore(embeddings, {
            client: supabase as SupabaseClient,
            tableName: 'embeddings' satisfies TableName<LangChainDatabase, 'public'>,
            queryName: 'match_documents' satisfies FunctionName<LangChainDatabase, 'public'>,
        });
        this.splitterOptions = { chunkSize, chunkOverlap };
    }

    private get embeddings(): TableDataService<LangChainDatabase, any, 'public', 'embeddings'> {
        return this.database.table('public', 'embeddings');
    }

    private getLoader(file: File): DocumentLoader {
        const mime = Mime.parse(file.type);

        if (mime.equals('text/csv')) {
            return new CSVLoader(file);
        }
        if (mime.equals('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
            return new DocxLoader(file, { type: 'docx' });
        }
        if (mime.equals('application/msword')) {
            return new DocxLoader(file, { type: 'doc' });
        }
        if (mime.equals('application/epub+zip')) {
            // TODO: can we use the supabase public URL here?
            const url = URL.createObjectURL(file);
            return new EPubLoader(url);
        }
        if (mime.equals('application/json')) {
            return new JSONLoader(file);
        }
        if (mime.equals('application/jsonl')) {
            return new JSONLinesLoader(file, '');
        }
        if (mime.equals('application/pdf')) {
            return new PDFLoader(file);
        }
        if (mime.equals('application/vnd.openxmlformats-officedocument.presentationml.presentation')) {
            return new PPTXLoader(file);
        }
        if (mime.equals('application/x-subrip')) {
            return new SRTLoader(file);
        }
        if (mime.type === 'text') {
            return new TextLoader(file);
        }

        throw new FileNotSupportedError(`File type ${file.type} is not supported`, {
            fileName: file.name,
            fileType: file.type,
        });
    }


    private getSplitter(file: File): RecursiveCharacterTextSplitter {
        const mimeToLanguageMap: Partial<Record<MimeString, SupportedTextSplitterLanguage>> = {
            'text/x-c++src': 'cpp',
            'text/x-go': 'go',
            'text/x-java-source': 'java',
            'application/javascript': 'js',
            'application/x-httpd-php': 'php',
            'application/x-protobuf': 'proto',
            'text/x-python': 'python',
            'text/x-rst': 'rst',
            'text/x-ruby': 'ruby',
            'text/x-rustsrc': 'rust',
            'text/x-scala': 'scala',
            'text/x-swift': 'swift',
            'text/markdown': 'markdown',
            'application/x-latex': 'latex',
            'text/html': 'html',
            'text/x-solidity': 'sol',
        };

        const language = mimeToLanguageMap[Mime.normalize(file.type)];

        if (language) {
            return RecursiveCharacterTextSplitter.fromLanguage(language, this.splitterOptions);
        }

        return new RecursiveCharacterTextSplitter(this.splitterOptions);
    }

    private async createEmbeddings(location: StorageLocation<BucketName>, metadata: Metadata): Promise<StorageDocument<BucketName, Metadata>[]> {
        const { file } = await this.storage.downloadFile(location);

        const loader = this.getLoader(file);
        const splitter = this.getSplitter(file);

        const documents = await loader.load()
            .then(async docs => splitter.splitDocuments(docs))
            .then(
                docs => docs.map(
                    doc => new Document({
                        pageContent: doc.pageContent,
                        id: doc.id,
                        metadata: {
                            ...doc.metadata,
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            ...metadata,
                            ...location,
                        },
                    }),
                ),
            );

        await this.vectorStore.addDocuments(documents);

        return documents;
    }

    private async deleteEmbeddings({ fileId }: StorageLocation<BucketName>): Promise<string[]> {
        const { data } = await this.embeddings.query
            .select(['id'])
            .eq<ColumnName<LangChainDatabase, 'public', 'Tables', 'embeddings'>>('file_id', fileId)
            .throwOnError();

        const ids = data.map(({ id }) => id);
        await this.vectorStore.delete({ ids });

        return ids;
    }

    private async updateEmbeddings(location: StorageLocation<BucketName>, metadata: Metadata): Promise<StorageDocument<BucketName, Metadata>[]> {
        await this.deleteEmbeddings(location);
        return this.createEmbeddings(location, metadata);
    }

    async ingest(fileRef: FileRef<BucketName>, metadata: Metadata | MetadataGeneratorFn<BucketName, Metadata>): Promise<StorageDocument<BucketName, Metadata>[]> {
        const location = await this.storage.getFileStorageLocation(fileRef);
        return this.updateEmbeddings(
            location,
            typeof metadata === 'function' ? metadata(location) : metadata,
        );
    }

    async update(bucket: BucketName, metadata: Metadata | MetadataGeneratorFn<BucketName, Metadata>): Promise<
        PromiseSettledResult<
            StorageDocument<BucketName, Metadata>[]
        >[]
    > {
        const { data } = await this.database
            .schema('langchain')
            .rpc('get_outdated_embeddings', { bucket: bucket as string })
            .throwOnError();

        return Promise.allSettled(
            data.map(async ({ bucket_id, path_tokens, file_id }) => this.ingest(
                {
                    bucket: bucket_id as BucketName,
                    path: path_tokens.join('/'),
                    fileId: file_id,
                },
                metadata,
            )),
        );
    }

    retriever(options: RetriverOptions<BucketName, Metadata>): BaseRetrieverInterface {
        return this.vectorStore.asRetriever(options);
    }

}
