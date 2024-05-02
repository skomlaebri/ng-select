import { OnChanges, OnDestroy, OnInit, AfterViewInit, ChangeDetectorRef, EventEmitter, TemplateRef, ElementRef, SimpleChanges, QueryList, InjectionToken } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { Subject } from 'rxjs';
import { ConsoleService } from './console.service';
import { ItemsList } from './items-list';
import { NgOption, DropdownPosition } from './ng-select.types';
import { NgDropdownPanelComponent } from './ng-dropdown-panel.component';
import { NgOptionComponent } from './ng-option.component';
import { SelectionModelFactory } from './selection-model';
import { NgSelectConfig } from './config.service';
import * as i0 from "@angular/core";
export declare const SELECTION_MODEL_FACTORY: InjectionToken<SelectionModelFactory>;
export declare type AddTagFn = ((term: string) => any | Promise<any>);
export declare type CompareWithFn = (a: any, b: any) => boolean;
export declare type GroupValueFn = (key: string | any, children: any[]) => string | any;
export declare class NgSelectComponent implements OnDestroy, OnChanges, OnInit, AfterViewInit, ControlValueAccessor {
    classes: string;
    private autoFocus;
    config: NgSelectConfig;
    private _cd;
    private _console;
    bindLabel: string;
    bindValue: string;
    markFirst: boolean;
    placeholder: string;
    notFoundText: string;
    typeToSearchText: string;
    addTagText: string;
    loadingText: string;
    clearAllText: string;
    appearance: string;
    dropdownPosition: DropdownPosition;
    appendTo: string;
    loading: boolean;
    closeOnSelect: boolean;
    hideSelected: boolean;
    selectOnTab: boolean;
    openOnEnter: boolean;
    maxSelectedItems: number;
    groupBy: string | ((value: any) => any);
    groupValue: GroupValueFn;
    bufferAmount: number;
    virtualScroll: boolean;
    selectableGroup: boolean;
    selectableGroupAsModel: boolean;
    searchFn: any;
    trackByFn: any;
    clearOnBackspace: boolean;
    labelForId: any;
    inputAttrs: {
        [key: string]: string;
    };
    tabIndex: number;
    readonly: boolean;
    searchWhileComposing: boolean;
    minTermLength: number;
    editableSearchTerm: boolean;
    keyDownFn: (_: KeyboardEvent) => boolean;
    typeahead: Subject<string>;
    multiple: boolean;
    addTag: boolean | AddTagFn;
    searchable: boolean;
    clearable: boolean;
    isOpen: boolean;
    get items(): any[] | null;
    set items(value: any[] | null);
    get compareWith(): CompareWithFn;
    set compareWith(fn: CompareWithFn);
    get clearSearchOnAdd(): boolean;
    set clearSearchOnAdd(value: boolean);
    blurEvent: EventEmitter<any>;
    focusEvent: EventEmitter<any>;
    changeEvent: EventEmitter<any>;
    openEvent: EventEmitter<any>;
    closeEvent: EventEmitter<any>;
    searchEvent: EventEmitter<{
        term: string;
        items: any[];
    }>;
    clearEvent: EventEmitter<any>;
    addEvent: EventEmitter<any>;
    removeEvent: EventEmitter<any>;
    scroll: EventEmitter<{
        start: number;
        end: number;
    }>;
    scrollToEnd: EventEmitter<any>;
    optionTemplate: TemplateRef<any>;
    optgroupTemplate: TemplateRef<any>;
    labelTemplate: TemplateRef<any>;
    multiLabelTemplate: TemplateRef<any>;
    headerTemplate: TemplateRef<any>;
    footerTemplate: TemplateRef<any>;
    notFoundTemplate: TemplateRef<any>;
    typeToSearchTemplate: TemplateRef<any>;
    loadingTextTemplate: TemplateRef<any>;
    tagTemplate: TemplateRef<any>;
    loadingSpinnerTemplate: TemplateRef<any>;
    dropdownPanel: NgDropdownPanelComponent;
    searchInput: ElementRef<HTMLInputElement>;
    ngOptions: QueryList<NgOptionComponent>;
    useDefaultClass: boolean;
    get disabled(): boolean;
    get filtered(): boolean;
    get single(): boolean;
    itemsList: ItemsList;
    viewPortItems: NgOption[];
    searchTerm: string;
    dropdownId: string;
    element: HTMLElement;
    focused: boolean;
    escapeHTML: boolean;
    private _items;
    private _itemsAreUsed;
    private _defaultLabel;
    private _primitive;
    private _manualOpen;
    private _disabled;
    private _pressedKeys;
    private _compareWith;
    private _clearSearchOnAdd;
    private _isComposing;
    private get _editableSearchTerm();
    private readonly _destroy$;
    private readonly _keyPress$;
    private _onChange;
    private _onTouched;
    clearItem: (item: any) => void;
    constructor(classes: string, autoFocus: any, config: NgSelectConfig, newSelectionModel: SelectionModelFactory, _elementRef: ElementRef<HTMLElement>, _cd: ChangeDetectorRef, _console: ConsoleService);
    get selectedItems(): NgOption[];
    get selectedValues(): any[];
    get hasValue(): boolean;
    get currentPanelPosition(): DropdownPosition;
    ngOnInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
    ngAfterViewInit(): void;
    ngOnDestroy(): void;
    handleKeyDown($event: KeyboardEvent): void;
    handleKeyCode($event: KeyboardEvent): void;
    handleMousedown($event: MouseEvent): void;
    handleArrowClick(): void;
    handleClearClick(): void;
    clearModel(): void;
    writeValue(value: any | any[]): void;
    registerOnChange(fn: any): void;
    registerOnTouched(fn: any): void;
    setDisabledState(state: boolean): void;
    toggle(): void;
    open(): void;
    close(): void;
    toggleItem(item: NgOption): void;
    select(item: NgOption): void;
    focus(): void;
    blur(): void;
    unselect(item: NgOption): void;
    selectTag(): void;
    showClear(): boolean;
    trackByOption: (_: number, item: NgOption) => any;
    get showAddTag(): boolean;
    showNoItemsFound(): boolean;
    showTypeToSearch(): boolean;
    onCompositionStart(): void;
    onCompositionEnd(term: string): void;
    filter(term: string): void;
    onInputFocus($event: any): void;
    onInputBlur($event: any): void;
    onItemHover(item: NgOption): void;
    detectChanges(): void;
    private _setSearchTermFromItems;
    private _setItems;
    private _setItemsFromNgOptions;
    private _isValidWriteValue;
    private _handleWriteValue;
    private _handleKeyPresses;
    private _setInputAttributes;
    private _updateNgModel;
    private _clearSearch;
    private _changeSearch;
    private _scrollToMarked;
    private _scrollToTag;
    private _onSelectionChanged;
    private _handleTab;
    private _handleEnter;
    private _handleSpace;
    private _handleArrowDown;
    private _handleArrowUp;
    private _nextItemIsTag;
    private _handleBackspace;
    private get _isTypeahead();
    private get _validTerm();
    private _mergeGlobalConfig;
    static ɵfac: i0.ɵɵFactoryDeclaration<NgSelectComponent, [{ attribute: "class"; }, { attribute: "autofocus"; }, null, null, null, null, null]>;
    static ɵcmp: i0.ɵɵComponentDeclaration<NgSelectComponent, "ng-select", never, { "bindLabel": "bindLabel"; "bindValue": "bindValue"; "markFirst": "markFirst"; "placeholder": "placeholder"; "notFoundText": "notFoundText"; "typeToSearchText": "typeToSearchText"; "addTagText": "addTagText"; "loadingText": "loadingText"; "clearAllText": "clearAllText"; "appearance": "appearance"; "dropdownPosition": "dropdownPosition"; "appendTo": "appendTo"; "loading": "loading"; "closeOnSelect": "closeOnSelect"; "hideSelected": "hideSelected"; "selectOnTab": "selectOnTab"; "openOnEnter": "openOnEnter"; "maxSelectedItems": "maxSelectedItems"; "groupBy": "groupBy"; "groupValue": "groupValue"; "bufferAmount": "bufferAmount"; "virtualScroll": "virtualScroll"; "selectableGroup": "selectableGroup"; "selectableGroupAsModel": "selectableGroupAsModel"; "searchFn": "searchFn"; "trackByFn": "trackByFn"; "clearOnBackspace": "clearOnBackspace"; "labelForId": "labelForId"; "inputAttrs": "inputAttrs"; "tabIndex": "tabIndex"; "readonly": "readonly"; "searchWhileComposing": "searchWhileComposing"; "minTermLength": "minTermLength"; "editableSearchTerm": "editableSearchTerm"; "keyDownFn": "keyDownFn"; "typeahead": "typeahead"; "multiple": "multiple"; "addTag": "addTag"; "searchable": "searchable"; "clearable": "clearable"; "isOpen": "isOpen"; "items": "items"; "compareWith": "compareWith"; "clearSearchOnAdd": "clearSearchOnAdd"; }, { "blurEvent": "blur"; "focusEvent": "focus"; "changeEvent": "change"; "openEvent": "open"; "closeEvent": "close"; "searchEvent": "search"; "clearEvent": "clear"; "addEvent": "add"; "removeEvent": "remove"; "scroll": "scroll"; "scrollToEnd": "scrollToEnd"; }, ["optionTemplate", "optgroupTemplate", "labelTemplate", "multiLabelTemplate", "headerTemplate", "footerTemplate", "notFoundTemplate", "typeToSearchTemplate", "loadingTextTemplate", "tagTemplate", "loadingSpinnerTemplate", "ngOptions"], never, false, never>;
}
