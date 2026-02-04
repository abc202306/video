/**
 * @version v1.0.1.20260204
 */

declare const app: any;
declare const module: any;

enum Config {
    DEFAULT_IMAGE_WIDTH = 200,
    TAB_CHAR = "\t",
    DASH_CHAR = "-",
    HEADING_PREFIX = "#",
}

interface DateParts {
    year: string;
    month: string;
    day: string;
}

class DateUtils {
    static readonly UNKNOWN_DATE: string = "Unknown";
    static readonly UNKNOWN_DAY: string = "Unknown Day";

    static extractDateParts(ctime: string | null): DateParts {
        if (!ctime) return { year: this.UNKNOWN_DATE, month: this.UNKNOWN_DATE, day: this.UNKNOWN_DAY };
        return {
            year: ctime.substring(0, 4),
            month: ctime.substring(0, 7),
            day: ctime.substring(0, 10)
        };
    }
}

enum AstNodeType {
    nodeDocument = "NodeDocument",
    nodeHeading = "NodeHeading",
    nodeParagraph = "NodeParagraph",
    nodeListItem = "NodeListItem",
    nodeList = "NodeList",
    nodeText = "NodeText",
    nodeMDText = "NodeMDText",
    nodeTextMark = "NodeTextMark",
    nodeBlockquote = "NodeBlockquote",
    nodeBlockquoteMarker = "NodeBlockquoteMarker",
    nodeImage = "NodeImage",
    nodeBang = "NodeBang",
    nodeOpenBracket = "NodeOpenBracket",
    nodeCloseBracket = "NodeCloseBracket",
    nodeOpenParen = "NodeOpenParen",
    nodeCloseParen = "NodeCloseParen",
    nodeLinkText = "NodeLinkText",
    nodeLinkDest = "NodeLinkDest",
    nodeTable = "NodeTable",
    nodeTableHead = "NodeTableHead",
    nodeTableRow = "NodeTableRow",
    nodeTableCell = "NodeTableCell",
    nodeBr = "NodeBr",
}

enum TextMarkType {
    blockRef = "block-ref",
    a = "a",
}

function escapeMarkdown(text: string): string {
    return text.replace(/([\\`*_[\]{}()#+\-.!])/g, '\\$1');
}

class AstNode {
    id: string | null;
    type: AstNodeType;
    data: string | null;
    children: AstNode[];
    headingLevel: number | null;

    textMarkType?: TextMarkType;
    textMarkTextContent?: string | null;
    textMarkAHref?: string;
    textMarkBlockRefId?: string;

    properties?: Record<string, unknown>;

    constructor(type: AstNodeType, children: AstNode[] = [], headingLevel: number | null = null, id: string | null = null, data: string | null = null) {
        this.id = id;
        this.type = type;
        this.data = data;
        this.children = children;
        this.headingLevel = headingLevel;
    }

    toString(indent: number = -1): string {
        const TAB = Config.TAB_CHAR;
        const DASH = Config.DASH_CHAR;
        const HEAD = Config.HEADING_PREFIX;

        switch (this.type) {
            case AstNodeType.nodeDocument:
                return this.children.map(child => child.toString(indent)).join("\n\n");
            case AstNodeType.nodeHeading:
                return `${HEAD.repeat(this.headingLevel || 1)} ${this.children.map(child => child.toString(indent)).join("")}`;
            case AstNodeType.nodeMDText:
                return this.data ?? "";
            case AstNodeType.nodeText:
                return escapeMarkdown(this.data || "");
            case AstNodeType.nodeTextMark:
                switch (this.textMarkType) {
                    case TextMarkType.a:
                        return `[${this.textMarkTextContent ? escapeMarkdown(this.textMarkTextContent) : this.textMarkAHref}](<${this.textMarkAHref}>)`;
                    case TextMarkType.blockRef:
                        if (this.textMarkTextContent) {
                            return `[${escapeMarkdown(this.textMarkTextContent)}](<${this.textMarkBlockRefId}>)`;
                        } else {
                            return `[${escapeMarkdown(this.textMarkBlockRefId || "")}](<${this.textMarkBlockRefId}>)`;
                        }
                }
            case AstNodeType.nodeImage:
                const imgSrc = this.children.find(child => child.type === AstNodeType.nodeLinkDest)?.data ?? "";
                const imgAlt = this.children.find(child => child.type === AstNodeType.nodeLinkText)?.data ?? "";
                const width = this.properties?.width ?? Config.DEFAULT_IMAGE_WIDTH;
                return `<img src="${imgSrc}" width=${width} alt="${imgAlt}"/>`.replace(/\s+/g, ' ').trim();
            case AstNodeType.nodeBlockquoteMarker:
                return this.data ?? ">";
            case AstNodeType.nodeBlockquote:
                const marker = this.children.find(child => child.type === AstNodeType.nodeBlockquoteMarker) || ">";
                return this.children
                    .filter(child => child.type !== AstNodeType.nodeBlockquoteMarker)
                    .map(child => child.toString(indent)).join("\n").split("\n").map(line => {
                        return `${marker} ${line}`;
                    }).join("\n");
            case AstNodeType.nodeParagraph:
                return this.children.map(child => child.toString(indent)).join("");
            case AstNodeType.nodeListItem:
                let i = 0;
                const strParts = this.children.map((child) => {
                    if (child.type === AstNodeType.nodeList) {
                        const childStr = child.toString(indent);
                        i += childStr.split("\n").length;
                        return childStr;
                    }
                    const childStr = child.toString(indent).split("\n").map(line => {
                        const newLine = `${TAB.repeat(indent)}${i === 0 ? DASH : " "} ${line}`;
                        i++;
                        return newLine;
                    }).join("\n");
                    return childStr;
                });
                return strParts.join("\n");
            case AstNodeType.nodeList:
                return this.children.map(child => child.toString(indent + 1)).join("\n");
            case AstNodeType.nodeTable:
                const tableHead = this.children.find(child => child.type === AstNodeType.nodeTableHead);
                const tableRows = this.children.filter(child => child.type === AstNodeType.nodeTableRow);
                return [
                    tableHead?.toString(indent),
                    "|" + " --- |".repeat(tableHead?.children?.[0]?.children.length || 0),
                    ...tableRows.map(row => row.toString(indent))
                ].filter(item => item).join("\n");
            case AstNodeType.nodeTableHead:
                return this.children.filter(child => child.type === AstNodeType.nodeTableRow).map(row => row.toString(indent)).join("\n");
            case AstNodeType.nodeTableRow:
                return "| " + this.children.filter(child => child.type === AstNodeType.nodeTableCell).map(cell => cell.toString(indent)).join(" | ") + " |";
            case AstNodeType.nodeTableCell:
                return this.children.map(child => child.toString(indent)).join("");
            case AstNodeType.nodeBr:
                return "<br>";
        }

        return "";
    }


}

function tableCell(...children: AstNode[]): AstNode {
    return new AstNode(AstNodeType.nodeTableCell, children);
}

function tableRow(...children: AstNode[]): AstNode {
    return new AstNode(AstNodeType.nodeTableRow, children);
}

function table(object: Record<string, any>[]): AstNode {
    const node = new AstNode(AstNodeType.nodeTable, []);

    if (!object || object.length === 0) {
        return node;
    }

    const tableHeadRow = tableRow(tableCell(text("")), tableCell(text("")))

    const tableHeadNode = new AstNode(AstNodeType.nodeTableHead, [tableHeadRow]);

    node.children.push(tableHeadNode);

    Object.entries(object).forEach(([key, value]) => {
        const keyCell = tableCell(mdText(key));
        const valueCell = tableCell(...parseValueToNodeArray(value));
        const rowNode = tableRow(keyCell, valueCell);
        node.children.push(rowNode);
    })

    return node;
}

function text(data: string): AstNode {
    return new AstNode(AstNodeType.nodeText, [], null, null, data);
}

function mdText(data: string): AstNode {
    return new AstNode(AstNodeType.nodeMDText, [], null, null, data);
}

function br() {
    return new AstNode(AstNodeType.nodeBr, [], null, null, "br");
}

function textMarkA(href: string, textContent: string): AstNode {
    const node = new AstNode(AstNodeType.nodeTextMark, []);
    node.textMarkType = TextMarkType.a;
    node.textMarkAHref = href;
    node.textMarkTextContent = textContent;
    return node;
}

function textMarkBlockRef(blockRefId: string, textContent: string | null): AstNode {
    const node = new AstNode(AstNodeType.nodeTextMark, []);
    node.textMarkType = TextMarkType.blockRef;
    node.textMarkBlockRefId = blockRefId;
    node.textMarkTextContent = textContent;
    return node;
}

function bang(): AstNode {
    return new AstNode(AstNodeType.nodeBang, []);
}

function openBracket(): AstNode {
    return new AstNode(AstNodeType.nodeOpenBracket, []);
}

function closeBracket(): AstNode {
    return new AstNode(AstNodeType.nodeCloseBracket, []);
}

function openParen(): AstNode {
    return new AstNode(AstNodeType.nodeOpenParen, []);
}

function closeParen(): AstNode {
    return new AstNode(AstNodeType.nodeCloseParen, []);
}

function linkText(text: string): AstNode {
    return new AstNode(AstNodeType.nodeLinkText, [], null, null, text);
}

function linkDest(dest: string): AstNode {
    return new AstNode(AstNodeType.nodeLinkDest, [], null, null, dest);
}

function image(src: string, alt: string = '', width: number = Config.DEFAULT_IMAGE_WIDTH): AstNode {
    const node = new AstNode(AstNodeType.nodeImage, []);

    node.properties = { width };
    node.children = [
        bang(),
        openBracket(),
        linkText(alt),
        closeBracket(),
        openParen(),
        linkDest(src),
        closeParen()
    ];

    return node;
}

function blockquoteMarker(): AstNode {
    const node = new AstNode(AstNodeType.nodeBlockquoteMarker, []);
    node.data = "\u003e";
    return node;
}

function convertStringOrTextToParagraphIFPossible(child: AstNode | string): AstNode {
    return typeof child === "string" || child.type === AstNodeType.nodeText || child.type === AstNodeType.nodeMDText
        ? p(child)
        : child;
}

function blockquote(...childrenItems: (AstNode | string)[]): AstNode {
    return new AstNode(AstNodeType.nodeBlockquote, [blockquoteMarker(), ...childrenItems.map(convertStringOrTextToParagraphIFPossible)]);
}

function p(...childrenItems: (AstNode | string)[]): AstNode {
    return new AstNode(AstNodeType.nodeParagraph, childrenItems.map(child =>
        typeof child === "string"
            ? text(child)
            : child
    ));
}

function li(...childrenItems: (AstNode | string)[]): AstNode {
    return new AstNode(AstNodeType.nodeListItem, childrenItems.map(convertStringOrTextToParagraphIFPossible));
}

function ul(...listItems: AstNode[]): AstNode {
    return new AstNode(AstNodeType.nodeList, listItems);
}

function h(level: number, ...childrenItems: (AstNode | string)[]): AstNode {
    return new AstNode(AstNodeType.nodeHeading, childrenItems.map(child =>
        typeof child === "string"
            ? text(child)
            : child
    ), level);
}

function doc(children: (AstNode | string)[] = []): AstNode {
    return new AstNode(AstNodeType.nodeDocument, children.map(convertStringOrTextToParagraphIFPossible));
}

class Link {
    static readonly BARE_LINK_REGEX: RegExp = /^\[\[(.*)\]\]$/;
    static readonly DISPLAY_LINK_REGEX: RegExp = /^\[\[(.*?)\|(.*)\]\]$/;
    static readonly MD_LINK_REGEX: RegExp = /^\[(.*)\]\((.*)\)$/;

    path: string;
    display: string | null;

    constructor(path: string, display: string | null = null) {
        this.path = path;
        this.display = display;
    }

    static parseMDLink(linkString: string | undefined | null): Link | null {
        if (!linkString) return null;
        const match = this.MD_LINK_REGEX.exec(linkString);
        if (match) {
            return new Link(match[2], match[1]);
        }
        return null;
    }

    static parseWikiLink(linkString: string | undefined | null): Link | null {
        if (!linkString) return null;
        const displayMatch = this.DISPLAY_LINK_REGEX.exec(linkString);
        if (displayMatch) {
            return new Link(displayMatch[1], displayMatch[2]);
        }
        const bareMatch = this.BARE_LINK_REGEX.exec(linkString);
        if (bareMatch) {
            return new Link(bareMatch[1], null);
        }
        return null;
    }

    toWikiLink() {
        return textMarkBlockRef(this.path, this.display);
    }

    toMDLink() {
        const file = app.metadataCache.getFirstLinkpathDest(this.path);
        const href = file ? file.path : this.path;
        const textContent = this.display || href;
        return textMarkA(href, textContent);
    }

    toImageNode(width: number = Config.DEFAULT_IMAGE_WIDTH): AstNode | null {
        const file = app.metadataCache.getFirstLinkpathDest(this.path);
        if (!file || !["jpg", "png", "webp", "svg"].includes(file.extension)) return null;
        return image(file.path, this.display || '', width);
    }
}

interface ItemData {
    path: string;
    title: string;
    url: string;
    description?: string;
    tags?: string[];
    image?: string;
    ctime: string;
    comment?: string;
    keywords?: string[];
    categories?: string[];
    note?: any;
}

function safeArray(v: any) {
    if (!v) { return []; }
    if (Array.isArray(v)) { return v; }
    return [v];
}

function parseValueToNodeArray(value: any, isEnableMDTextForCommonText: boolean = false): AstNode[] {
    if (value === null || value === undefined) {
        return [];
    }
    if (Array.isArray(value)) {
        return value.flatMap(v => [br(), ...parseValueToNodeArray(v, isEnableMDTextForCommonText)]).slice(1);
    }
    if (typeof value === "string") {
        const wikilinkObj = Link.parseWikiLink(value);
        const mdlinkObj = Link.parseMDLink(value);
        if (wikilinkObj) {
            const imageNode = wikilinkObj.toImageNode();
            return [wikilinkObj.toMDLink(), imageNode ? br() : null, imageNode].filter(value => value !== null);
        } else if (mdlinkObj) {
            return [mdlinkObj.toMDLink()];
        } else if (/^http(s)?:\/\//.test(value)) {
            return [textMarkA(value, value)];
        } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
            return [mdText(value)]
        } else {
            return [isEnableMDTextForCommonText ? mdText(value) : text(value)];
        }
    }
    return [text(value + "")];
}

function replaceAllImageEmbed(comment: string): string {
    const IMAGE_EMBED_REGEXP = /\!(?<wikilink>\[\[(?<path>.*?\.(png|jpg|webp|svg))\|(?<width>\d+)\]\])/;
    let match;
    while (true) {
        match = IMAGE_EMBED_REGEXP.exec(comment);

        if (!match) {
            break;
        }
        const wikilinkObj = Link.parseWikiLink(match.groups?.wikilink);
        const imageNode = wikilinkObj?.toImageNode(parseInt(match.groups?.width || "200"));
        comment = comment.replace(IMAGE_EMBED_REGEXP, imageNode?.toString() || "");
    }
    return comment;
}

class Collection {
    static parseItemDatatoAstNodeArray({ path, title, url, description, tags, image, ctime, comment, keywords, categories, note }: ItemData): (AstNode | string)[] {
        const tagParagraphChildren = safeArray(categories).concat(safeArray(keywords)).concat(safeArray(tags)).map(k => {
            const wikilinkObj = Link.parseWikiLink(k);
            if (!wikilinkObj) {
                return mdText(`#${k}`);
            }
            const file = app.metadataCache.getFirstLinkpathDest(wikilinkObj.path);
            const path = file ? file.path : wikilinkObj.path;
            const display = wikilinkObj.display ? `#${wikilinkObj.display}` : null;
            return textMarkBlockRef(path, display);
        }).flatMap(item => [", ", item]).slice(1);

        const tagParagraph = tagParagraphChildren.length !== 0 ? p(...tagParagraphChildren) : p("No tags");

        return [
            h(4, textMarkA(url, title), ` | `, textMarkBlockRef(path, "note")),
            mdText(description || "No description"),
            tagParagraph,
            Link.parseWikiLink(image)?.toImageNode() ?? "No image",
            mdText(`Created at: ${ctime}`),
            blockquote(mdText(replaceAllImageEmbed(comment?.replace(/<br>/g, "\n") || "No comment"))),
            // note ? "| | |\n| --- | --- |\n" + Object.entries(note || {}).map(([key, value]) => `| ${key} | ${toStringInMDTable(value)} |`).join("\n") : "No additional note",
            note ? table(note) : "No additional note",
        ]
    }

    static groupByDatePart(items: AstNode[], dateExtractor: (item: AstNode) => string): [string, AstNode[]][] {
        return Object.entries(Object.groupBy(items, dateExtractor) as Record<string, AstNode[]>)
            .sort((a, b) => b[0].localeCompare(a[0]));
    }

    static getMOCData(folderPath: string): (AstNode | string)[] {
        const nodeArrArr: (AstNode | string)[][] = app.vault.getMarkdownFiles()
            .filter((file: any) => file.path.startsWith(folderPath))
            .map((file: any) => {
                const cache = app.metadataCache.getFileCache(file);
                const fileTags = safeArray(cache?.tags?.map((tagInfo: { tag: string }) => tagInfo.tag.slice(1))?.unique());
                const frontmatter = cache?.frontmatter || {};
                const { title, url, ctime, description, cover, icon, comment, keywords, categories, tags: fmTags } = frontmatter;
                const { day, month, year } = DateUtils.extractDateParts(ctime);
                const note = Object.entries(frontmatter)
                    .filter(([key, _]) => !["title", "url", "ctime", "description", "cover", "icon", "comment", "keywords", "categories", "tags"].includes(key))
                    .reduce((obj, [key, value]) => {
                        if (value === null || value === undefined) return obj;
                        obj[key] = value;
                        return obj;
                    }, {} as any);
                return { day, month, year, path: file.path, title, url, ctime, description, tags: ([...safeArray(fmTags), ...fileTags] as any).filter(Boolean).unique(), image: cover || icon, comment, keywords, categories, note } as ItemData;
            }).sort((a: ItemData, b: ItemData) => b.ctime.localeCompare(a.ctime))
            .map(Collection.parseItemDatatoAstNodeArray);
        const nodes: (AstNode | string)[] = [
            ul(...nodeArrArr.map(nodeArr => li(p(...(nodeArr[0] as AstNode).children)))), 
            ...nodeArrArr.flatMap(nodeArr => nodeArr)
        ];

        return [h(3, mdText((folderPath.split("/").filter(part => part.length !== 0).at(-1) || "").replace(/\/$/, ""))), ...nodes];
    }
}

class VideoMOC {
    static toString(FOLDER_ARRAY: string[]): string {
        const docNode = doc(FOLDER_ARRAY.flatMap(folder => Collection.getMOCData(folder)));
        return docNode.toString();
    }
}

module.exports = VideoMOC.toString;
