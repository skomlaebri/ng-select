import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Inject, Input, Optional, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { animationFrameScheduler, asapScheduler, fromEvent, merge, Subject } from 'rxjs';
import { auditTime, takeUntil } from 'rxjs/operators';
import { isDefined } from './value-utils';
import * as i0 from "@angular/core";
import * as i1 from "./ng-dropdown-panel.service";
import * as i2 from "@angular/common";
const CSS_POSITIONS = ['top', 'right', 'bottom', 'left'];
const SCROLL_SCHEDULER = typeof requestAnimationFrame !== 'undefined' ? animationFrameScheduler : asapScheduler;
export class NgDropdownPanelComponent {
    constructor(_renderer, _zone, _panelService, _elementRef, _document) {
        this._renderer = _renderer;
        this._zone = _zone;
        this._panelService = _panelService;
        this._document = _document;
        this.items = [];
        this.position = 'auto';
        this.virtualScroll = false;
        this.filterValue = null;
        this.update = new EventEmitter();
        this.scroll = new EventEmitter();
        this.scrollToEnd = new EventEmitter();
        this.outsideClick = new EventEmitter();
        this._destroy$ = new Subject();
        this._scrollToEndFired = false;
        this._updateScrollHeight = false;
        this._lastScrollPosition = 0;
        this._dropdown = _elementRef.nativeElement;
    }
    get currentPosition() {
        return this._currentPosition;
    }
    get itemsLength() {
        return this._itemsLength;
    }
    set itemsLength(value) {
        if (value !== this._itemsLength) {
            this._itemsLength = value;
            this._onItemsLengthChanged();
        }
    }
    get _startOffset() {
        if (this.markedItem) {
            const { itemHeight, panelHeight } = this._panelService.dimensions;
            const offset = this.markedItem.index * itemHeight;
            return panelHeight > offset ? 0 : offset;
        }
        return 0;
    }
    ngOnInit() {
        this._select = this._dropdown.parentElement;
        this._virtualPadding = this.paddingElementRef.nativeElement;
        this._scrollablePanel = this.scrollElementRef.nativeElement;
        this._contentPanel = this.contentElementRef.nativeElement;
        this._handleScroll();
        this._handleOutsideClick();
        this._appendDropdown();
        this._setupMousedownListener();
    }
    ngOnChanges(changes) {
        if (changes.items) {
            const change = changes.items;
            this._onItemsChange(change.currentValue, change.firstChange);
        }
    }
    ngOnDestroy() {
        this._destroy$.next();
        this._destroy$.complete();
        this._destroy$.unsubscribe();
        if (this.appendTo) {
            this._renderer.removeChild(this._dropdown.parentNode, this._dropdown);
        }
    }
    scrollTo(option, startFromOption = false) {
        if (!option) {
            return;
        }
        const index = this.items.indexOf(option);
        if (index < 0 || index >= this.itemsLength) {
            return;
        }
        let scrollTo;
        if (this.virtualScroll) {
            const itemHeight = this._panelService.dimensions.itemHeight;
            scrollTo = this._panelService.getScrollTo(index * itemHeight, itemHeight, this._lastScrollPosition);
        }
        else {
            const item = this._dropdown.querySelector(`#${option.htmlId}`);
            const lastScroll = startFromOption ? item.offsetTop : this._lastScrollPosition;
            scrollTo = this._panelService.getScrollTo(item.offsetTop, item.clientHeight, lastScroll);
        }
        if (isDefined(scrollTo)) {
            this._scrollablePanel.scrollTop = scrollTo;
        }
    }
    scrollToTag() {
        const panel = this._scrollablePanel;
        panel.scrollTop = panel.scrollHeight - panel.clientHeight;
    }
    adjustPosition() {
        this._updateYPosition();
    }
    _handleDropdownPosition() {
        this._currentPosition = this._calculateCurrentPosition(this._dropdown);
        if (CSS_POSITIONS.includes(this._currentPosition)) {
            this._updateDropdownClass(this._currentPosition);
        }
        else {
            this._updateDropdownClass('bottom');
        }
        if (this.appendTo) {
            this._updateYPosition();
        }
        this._dropdown.style.opacity = '1';
    }
    _updateDropdownClass(currentPosition) {
        CSS_POSITIONS.forEach((position) => {
            const REMOVE_CSS_CLASS = `ng-select-${position}`;
            this._renderer.removeClass(this._dropdown, REMOVE_CSS_CLASS);
            this._renderer.removeClass(this._select, REMOVE_CSS_CLASS);
        });
        const ADD_CSS_CLASS = `ng-select-${currentPosition}`;
        this._renderer.addClass(this._dropdown, ADD_CSS_CLASS);
        this._renderer.addClass(this._select, ADD_CSS_CLASS);
    }
    _handleScroll() {
        this._zone.runOutsideAngular(() => {
            fromEvent(this.scrollElementRef.nativeElement, 'scroll')
                .pipe(takeUntil(this._destroy$), auditTime(0, SCROLL_SCHEDULER))
                .subscribe((e) => {
                const path = e.path || (e.composedPath && e.composedPath());
                const scrollTop = !path || path.length === 0 ? e.target.scrollTop : path[0].scrollTop;
                this._onContentScrolled(scrollTop);
            });
        });
    }
    _handleOutsideClick() {
        if (!this._document) {
            return;
        }
        this._zone.runOutsideAngular(() => {
            merge(fromEvent(this._document, 'touchstart', { capture: true }), fromEvent(this._document, 'mousedown', { capture: true })).pipe(takeUntil(this._destroy$))
                .subscribe($event => this._checkToClose($event));
        });
    }
    _checkToClose($event) {
        if (this._select.contains($event.target) || this._dropdown.contains($event.target)) {
            return;
        }
        const path = $event.path || ($event.composedPath && $event.composedPath());
        if ($event.target && $event.target.shadowRoot && path && path[0] && this._select.contains(path[0])) {
            return;
        }
        this._zone.run(() => this.outsideClick.emit());
    }
    _onItemsChange(items, firstChange) {
        this.items = items || [];
        this._scrollToEndFired = false;
        this.itemsLength = items.length;
        if (this.virtualScroll) {
            this._updateItemsRange(firstChange);
        }
        else {
            this._setVirtualHeight();
            this._updateItems(firstChange);
        }
    }
    _updateItems(firstChange) {
        this.update.emit(this.items);
        if (firstChange === false) {
            return;
        }
        this._zone.runOutsideAngular(() => {
            Promise.resolve().then(() => {
                const panelHeight = this._scrollablePanel.clientHeight;
                this._panelService.setDimensions(0, panelHeight);
                this._handleDropdownPosition();
                this.scrollTo(this.markedItem, firstChange);
            });
        });
    }
    _updateItemsRange(firstChange) {
        this._zone.runOutsideAngular(() => {
            this._measureDimensions().then(() => {
                if (firstChange) {
                    this._renderItemsRange(this._startOffset);
                    this._handleDropdownPosition();
                }
                else {
                    this._renderItemsRange();
                }
            });
        });
    }
    _onContentScrolled(scrollTop) {
        if (this.virtualScroll) {
            this._renderItemsRange(scrollTop);
        }
        this._lastScrollPosition = scrollTop;
        this._fireScrollToEnd(scrollTop);
    }
    _updateVirtualHeight(height) {
        if (this._updateScrollHeight) {
            this._virtualPadding.style.height = `${height}px`;
            this._updateScrollHeight = false;
        }
    }
    _setVirtualHeight() {
        if (!this._virtualPadding) {
            return;
        }
        this._virtualPadding.style.height = `0px`;
    }
    _onItemsLengthChanged() {
        this._updateScrollHeight = true;
    }
    _renderItemsRange(scrollTop = null) {
        if (scrollTop && this._lastScrollPosition === scrollTop) {
            return;
        }
        scrollTop = scrollTop || this._scrollablePanel.scrollTop;
        const range = this._panelService.calculateItems(scrollTop, this.itemsLength, this.bufferAmount);
        this._updateVirtualHeight(range.scrollHeight);
        this._contentPanel.style.transform = `translateY(${range.topPadding}px)`;
        this._zone.run(() => {
            this.update.emit(this.items.slice(range.start, range.end));
            this.scroll.emit({ start: range.start, end: range.end });
        });
        if (isDefined(scrollTop) && this._lastScrollPosition === 0) {
            this._scrollablePanel.scrollTop = scrollTop;
            this._lastScrollPosition = scrollTop;
        }
    }
    _measureDimensions() {
        if (this._panelService.dimensions.itemHeight > 0 || this.itemsLength === 0) {
            return Promise.resolve(this._panelService.dimensions);
        }
        const [first] = this.items;
        this.update.emit([first]);
        return Promise.resolve().then(() => {
            const option = this._dropdown.querySelector(`#${first.htmlId}`);
            const optionHeight = option.clientHeight;
            this._virtualPadding.style.height = `${optionHeight * this.itemsLength}px`;
            const panelHeight = this._scrollablePanel.clientHeight;
            this._panelService.setDimensions(optionHeight, panelHeight);
            return this._panelService.dimensions;
        });
    }
    _fireScrollToEnd(scrollTop) {
        if (this._scrollToEndFired || scrollTop === 0) {
            return;
        }
        const padding = this.virtualScroll ?
            this._virtualPadding :
            this._contentPanel;
        if (scrollTop + this._dropdown.clientHeight >= padding.clientHeight - 1) {
            this._zone.run(() => this.scrollToEnd.emit());
            this._scrollToEndFired = true;
        }
    }
    _calculateCurrentPosition(dropdownEl) {
        if (this.position !== 'auto') {
            return this.position;
        }
        const selectRect = this._select.getBoundingClientRect();
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        const offsetTop = selectRect.top + window.pageYOffset;
        const height = selectRect.height;
        const dropdownHeight = dropdownEl.getBoundingClientRect().height;
        if (offsetTop + height + dropdownHeight > scrollTop + document.documentElement.clientHeight) {
            return 'top';
        }
        else {
            return 'bottom';
        }
    }
    _appendDropdown() {
        if (!this.appendTo) {
            return;
        }
        this._parent = document.querySelector(this.appendTo);
        if (!this._parent) {
            throw new Error(`appendTo selector ${this.appendTo} did not found any parent element`);
        }
        this._updateXPosition();
        this._parent.appendChild(this._dropdown);
    }
    _updateXPosition() {
        const select = this._select.getBoundingClientRect();
        const parent = this._parent.getBoundingClientRect();
        const offsetLeft = select.left - parent.left;
        this._dropdown.style.left = offsetLeft + 'px';
        this._dropdown.style.width = select.width + 'px';
        this._dropdown.style.minWidth = select.width + 'px';
    }
    _updateYPosition() {
        const select = this._select.getBoundingClientRect();
        const parent = this._parent.getBoundingClientRect();
        const delta = select.height;
        if (this._currentPosition === 'top') {
            const offsetBottom = parent.bottom - select.bottom;
            this._dropdown.style.bottom = offsetBottom + delta + 'px';
            this._dropdown.style.top = 'auto';
        }
        else if (this._currentPosition === 'bottom') {
            const offsetTop = select.top - parent.top;
            this._dropdown.style.top = offsetTop + delta + 'px';
            this._dropdown.style.bottom = 'auto';
        }
    }
    _setupMousedownListener() {
        this._zone.runOutsideAngular(() => {
            fromEvent(this._dropdown, 'mousedown')
                .pipe(takeUntil(this._destroy$))
                .subscribe((event) => {
                const target = event.target;
                if (target.tagName === 'INPUT') {
                    return;
                }
                event.preventDefault();
            });
        });
    }
}
NgDropdownPanelComponent.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.0.0", ngImport: i0, type: NgDropdownPanelComponent, deps: [{ token: i0.Renderer2 }, { token: i0.NgZone }, { token: i1.NgDropdownPanelService }, { token: i0.ElementRef }, { token: DOCUMENT, optional: true }], target: i0.ɵɵFactoryTarget.Component });
NgDropdownPanelComponent.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "15.0.0", type: NgDropdownPanelComponent, selector: "ng-dropdown-panel", inputs: { items: "items", markedItem: "markedItem", position: "position", appendTo: "appendTo", bufferAmount: "bufferAmount", virtualScroll: "virtualScroll", headerTemplate: "headerTemplate", footerTemplate: "footerTemplate", filterValue: "filterValue" }, outputs: { update: "update", scroll: "scroll", scrollToEnd: "scrollToEnd", outsideClick: "outsideClick" }, viewQueries: [{ propertyName: "contentElementRef", first: true, predicate: ["content"], descendants: true, read: ElementRef, static: true }, { propertyName: "scrollElementRef", first: true, predicate: ["scroll"], descendants: true, read: ElementRef, static: true }, { propertyName: "paddingElementRef", first: true, predicate: ["padding"], descendants: true, read: ElementRef, static: true }], usesOnChanges: true, ngImport: i0, template: `
        <div *ngIf="headerTemplate" class="ng-dropdown-header">
            <ng-container [ngTemplateOutlet]="headerTemplate" [ngTemplateOutletContext]="{ searchTerm: filterValue }"></ng-container>
        </div>
        <div #scroll class="ng-dropdown-panel-items scroll-host">
            <div #padding [class.total-padding]="virtualScroll"></div>
            <div #content [class.scrollable-content]="virtualScroll && items.length">
                <ng-content></ng-content>
            </div>
        </div>
        <div *ngIf="footerTemplate" class="ng-dropdown-footer">
            <ng-container [ngTemplateOutlet]="footerTemplate" [ngTemplateOutletContext]="{ searchTerm: filterValue }"></ng-container>
        </div>
    `, isInline: true, dependencies: [{ kind: "directive", type: i2.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "directive", type: i2.NgTemplateOutlet, selector: "[ngTemplateOutlet]", inputs: ["ngTemplateOutletContext", "ngTemplateOutlet", "ngTemplateOutletInjector"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.0.0", ngImport: i0, type: NgDropdownPanelComponent, decorators: [{
            type: Component,
            args: [{
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    encapsulation: ViewEncapsulation.None,
                    selector: 'ng-dropdown-panel',
                    template: `
        <div *ngIf="headerTemplate" class="ng-dropdown-header">
            <ng-container [ngTemplateOutlet]="headerTemplate" [ngTemplateOutletContext]="{ searchTerm: filterValue }"></ng-container>
        </div>
        <div #scroll class="ng-dropdown-panel-items scroll-host">
            <div #padding [class.total-padding]="virtualScroll"></div>
            <div #content [class.scrollable-content]="virtualScroll && items.length">
                <ng-content></ng-content>
            </div>
        </div>
        <div *ngIf="footerTemplate" class="ng-dropdown-footer">
            <ng-container [ngTemplateOutlet]="footerTemplate" [ngTemplateOutletContext]="{ searchTerm: filterValue }"></ng-container>
        </div>
    `
                }]
        }], ctorParameters: function () { return [{ type: i0.Renderer2 }, { type: i0.NgZone }, { type: i1.NgDropdownPanelService }, { type: i0.ElementRef }, { type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [DOCUMENT]
                }] }]; }, propDecorators: { items: [{
                type: Input
            }], markedItem: [{
                type: Input
            }], position: [{
                type: Input
            }], appendTo: [{
                type: Input
            }], bufferAmount: [{
                type: Input
            }], virtualScroll: [{
                type: Input
            }], headerTemplate: [{
                type: Input
            }], footerTemplate: [{
                type: Input
            }], filterValue: [{
                type: Input
            }], update: [{
                type: Output
            }], scroll: [{
                type: Output
            }], scrollToEnd: [{
                type: Output
            }], outsideClick: [{
                type: Output
            }], contentElementRef: [{
                type: ViewChild,
                args: ['content', { read: ElementRef, static: true }]
            }], scrollElementRef: [{
                type: ViewChild,
                args: ['scroll', { read: ElementRef, static: true }]
            }], paddingElementRef: [{
                type: ViewChild,
                args: ['padding', { read: ElementRef, static: true }]
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctZHJvcGRvd24tcGFuZWwuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL25nLXNlbGVjdC9saWIvbmctZHJvcGRvd24tcGFuZWwuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQ0gsdUJBQXVCLEVBQ3ZCLFNBQVMsRUFDVCxVQUFVLEVBQ1YsWUFBWSxFQUNaLE1BQU0sRUFDTixLQUFLLEVBS0wsUUFBUSxFQUNSLE1BQU0sRUFJTixTQUFTLEVBQ1QsaUJBQWlCLEVBQ3BCLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDekYsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUt0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZUFBZSxDQUFDOzs7O0FBRTFDLE1BQU0sYUFBYSxHQUF1QixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzdFLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxxQkFBcUIsS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUM7QUFxQmhILE1BQU0sT0FBTyx3QkFBd0I7SUFnQ2pDLFlBQ1ksU0FBb0IsRUFDcEIsS0FBYSxFQUNiLGFBQXFDLEVBQzdDLFdBQXVCLEVBQ2UsU0FBYztRQUo1QyxjQUFTLEdBQVQsU0FBUyxDQUFXO1FBQ3BCLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixrQkFBYSxHQUFiLGFBQWEsQ0FBd0I7UUFFUCxjQUFTLEdBQVQsU0FBUyxDQUFLO1FBbkMvQyxVQUFLLEdBQWUsRUFB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QUFLO2dCQUNHLFlBQVk7c0JBQXBCLEtBQUs7Z0JBQ0csYUFBYTtzQkFBckIsS0FBSztnQkFDRyxjQUFjO3NCQUF0QixLQUFLO2dCQUNHLGNBQWM7c0JBQXRCLEtBQUs7Z0JBQ0csV0FBVztzQkFBbkIsS0FBSztnQkFFSSxNQUFNO3NCQUFmLE1BQU07Z0JBQ0csTUFBTTtzQkFBZixNQUFNO2dCQUNHLFdBQVc7c0JBQXBCLE1BQU07Z0JBQ0csWUFBWTtzQkFBckIsTUFBTTtnQkFFbUQsaUJBQWlCO3NCQUExRSxTQUFTO3VCQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtnQkFDQyxnQkFBZ0I7c0JBQXhFLFNBQVM7dUJBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO2dCQUNHLGlCQUFpQjtzQkFBMUUsU0FBUzt1QkFBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBET0NVTUVOVCB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge1xuICAgIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICAgIENvbXBvbmVudCxcbiAgICBFbGVtZW50UmVmLFxuICAgIEV2ZW50RW1pdHRlcixcbiAgICBJbmplY3QsXG4gICAgSW5wdXQsXG4gICAgTmdab25lLFxuICAgIE9uQ2hhbmdlcyxcbiAgICBPbkRlc3Ryb3ksXG4gICAgT25Jbml0LFxuICAgIE9wdGlvbmFsLFxuICAgIE91dHB1dCxcbiAgICBSZW5kZXJlcjIsXG4gICAgU2ltcGxlQ2hhbmdlcyxcbiAgICBUZW1wbGF0ZVJlZixcbiAgICBWaWV3Q2hpbGQsXG4gICAgVmlld0VuY2Fwc3VsYXRpb25cbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBhbmltYXRpb25GcmFtZVNjaGVkdWxlciwgYXNhcFNjaGVkdWxlciwgZnJvbUV2ZW50LCBtZXJnZSwgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgYXVkaXRUaW1lLCB0YWtlVW50aWwgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBOZ0Ryb3Bkb3duUGFuZWxTZXJ2aWNlLCBQYW5lbERpbWVuc2lvbnMgfSBmcm9tICcuL25nLWRyb3Bkb3duLXBhbmVsLnNlcnZpY2UnO1xuXG5pbXBvcnQgeyBEcm9wZG93blBvc2l0aW9uIH0gZnJvbSAnLi9uZy1zZWxlY3QudHlwZXMnO1xuaW1wb3J0IHsgTmdPcHRpb24gfSBmcm9tICcuL25nLXNlbGVjdC50eXBlcyc7XG5pbXBvcnQgeyBpc0RlZmluZWQgfSBmcm9tICcuL3ZhbHVlLXV0aWxzJztcblxuY29uc3QgQ1NTX1BPU0lUSU9OUzogUmVhZG9ubHk8c3RyaW5nW10+ID0gWyd0b3AnLCAncmlnaHQnLCAnYm90dG9tJywgJ2xlZnQnXTtcbmNvbnN0IFNDUk9MTF9TQ0hFRFVMRVIgPSB0eXBlb2YgcmVxdWVzdEFuaW1hdGlvbkZyYW1lICE9PSAndW5kZWZpbmVkJyA/IGFuaW1hdGlvbkZyYW1lU2NoZWR1bGVyIDogYXNhcFNjaGVkdWxlcjtcblxuQENvbXBvbmVudCh7XG4gICAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG4gICAgZW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uTm9uZSxcbiAgICBzZWxlY3RvcjogJ25nLWRyb3Bkb3duLXBhbmVsJyxcbiAgICB0ZW1wbGF0ZTogYFxuICAgICAgICA8ZGl2ICpuZ0lmPVwiaGVhZGVyVGVtcGxhdGVcIiBjbGFzcz1cIm5nLWRyb3Bkb3duLWhlYWRlclwiPlxuICAgICAgICAgICAgPG5nLWNvbnRhaW5lciBbbmdUZW1wbGF0ZU91dGxldF09XCJoZWFkZXJUZW1wbGF0ZVwiIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7IHNlYXJjaFRlcm06IGZpbHRlclZhbHVlIH1cIj48L25nLWNvbnRhaW5lcj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgI3Njcm9sbCBjbGFzcz1cIm5nLWRyb3Bkb3duLXBhbmVsLWl0ZW1zIHNjcm9sbC1ob3N0XCI+XG4gICAgICAgICAgICA8ZGl2ICNwYWRkaW5nIFtjbGFzcy50b3RhbC1wYWRkaW5nXT1cInZpcnR1YWxTY3JvbGxcIj48L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgI2NvbnRlbnQgW2NsYXNzLnNjcm9sbGFibGUtY29udGVudF09XCJ2aXJ0dWFsU2Nyb2xsICYmIGl0ZW1zLmxlbmd0aFwiPlxuICAgICAgICAgICAgICAgIDxuZy1jb250ZW50PjwvbmctY29udGVudD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiAqbmdJZj1cImZvb3RlclRlbXBsYXRlXCIgY2xhc3M9XCJuZy1kcm9wZG93bi1mb290ZXJcIj5cbiAgICAgICAgICAgIDxuZy1jb250YWluZXIgW25nVGVtcGxhdGVPdXRsZXRdPVwiZm9vdGVyVGVtcGxhdGVcIiBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyBzZWFyY2hUZXJtOiBmaWx0ZXJWYWx1ZSB9XCI+PC9uZy1jb250YWluZXI+XG4gICAgICAgIDwvZGl2PlxuICAgIGBcbiAgICB9KVxuZXhwb3J0IGNsYXNzIE5nRHJvcGRvd25QYW5lbENvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCwgT25DaGFuZ2VzLCBPbkRlc3Ryb3kge1xuXG4gICAgQElucHV0KCkgaXRlbXM6IE5nT3B0aW9uW10gPSBbXTtcbiAgICBASW5wdXQoKSBtYXJrZWRJdGVtOiBOZ09wdGlvbjtcbiAgICBASW5wdXQoKSBwb3NpdGlvbjogRHJvcGRvd25Qb3NpdGlvbiA9ICdhdXRvJztcbiAgICBASW5wdXQoKSBhcHBlbmRUbzogc3RyaW5nO1xuICAgIEBJbnB1dCgpIGJ1ZmZlckFtb3VudDtcbiAgICBASW5wdXQoKSB2aXJ0dWFsU2Nyb2xsID0gZmFsc2U7XG4gICAgQElucHV0KCkgaGVhZGVyVGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG4gICAgQElucHV0KCkgZm9vdGVyVGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG4gICAgQElucHV0KCkgZmlsdGVyVmFsdWU6IHN0cmluZyA9IG51bGw7XG5cbiAgICBAT3V0cHV0KCkgdXBkYXRlID0gbmV3IEV2ZW50RW1pdHRlcjxhbnlbXT4oKTtcbiAgICBAT3V0cHV0KCkgc2Nyb2xsID0gbmV3IEV2ZW50RW1pdHRlcjx7IHN0YXJ0OiBudW1iZXI7IGVuZDogbnVtYmVyIH0+KCk7XG4gICAgQE91dHB1dCgpIHNjcm9sbFRvRW5kID0gbmV3IEV2ZW50RW1pdHRlcjx2b2lkPigpO1xuICAgIEBPdXRwdXQoKSBvdXRzaWRlQ2xpY2sgPSBuZXcgRXZlbnRFbWl0dGVyPHZvaWQ+KCk7XG5cbiAgICBAVmlld0NoaWxkKCdjb250ZW50JywgeyByZWFkOiBFbGVtZW50UmVmLCBzdGF0aWM6IHRydWUgfSkgY29udGVudEVsZW1lbnRSZWY6IEVsZW1lbnRSZWY7XG4gICAgQFZpZXdDaGlsZCgnc2Nyb2xsJywgeyByZWFkOiBFbGVtZW50UmVmLCBzdGF0aWM6IHRydWUgfSkgc2Nyb2xsRWxlbWVudFJlZjogRWxlbWVudFJlZjtcbiAgICBAVmlld0NoaWxkKCdwYWRkaW5nJywgeyByZWFkOiBFbGVtZW50UmVmLCBzdGF0aWM6IHRydWUgfSkgcGFkZGluZ0VsZW1lbnRSZWY6IEVsZW1lbnRSZWY7XG5cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9kZXN0cm95JCA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfZHJvcGRvd246IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgX3ZpcnR1YWxQYWRkaW5nOiBIVE1MRWxlbWVudDtcbiAgICBwcml2YXRlIF9zY3JvbGxhYmxlUGFuZWw6IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgX2NvbnRlbnRQYW5lbDogSFRNTEVsZW1lbnQ7XG4gICAgcHJpdmF0ZSBfc2VsZWN0OiBIVE1MRWxlbWVudDtcbiAgICBwcml2YXRlIF9wYXJlbnQ6IEhUTUxFbGVtZW50O1xuICAgIHByaXZhdGUgX3Njcm9sbFRvRW5kRmlyZWQgPSBmYWxzZTtcbiAgICBwcml2YXRlIF91cGRhdGVTY3JvbGxIZWlnaHQgPSBmYWxzZTtcbiAgICBwcml2YXRlIF9sYXN0U2Nyb2xsUG9zaXRpb24gPSAwO1xuXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHByaXZhdGUgX3JlbmRlcmVyOiBSZW5kZXJlcjIsXG4gICAgICAgIHByaXZhdGUgX3pvbmU6IE5nWm9uZSxcbiAgICAgICAgcHJpdmF0ZSBfcGFuZWxTZXJ2aWNlOiBOZ0Ryb3Bkb3duUGFuZWxTZXJ2aWNlLFxuICAgICAgICBfZWxlbWVudFJlZjogRWxlbWVudFJlZixcbiAgICAgICAgQE9wdGlvbmFsKCkgQEluamVjdChET0NVTUVOVCkgcHJpdmF0ZSBfZG9jdW1lbnQ6IGFueVxuICAgICkge1xuICAgICAgICB0aGlzLl9kcm9wZG93biA9IF9lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfY3VycmVudFBvc2l0aW9uOiBEcm9wZG93blBvc2l0aW9uO1xuXG4gICAgZ2V0IGN1cnJlbnRQb3NpdGlvbigpOiBEcm9wZG93blBvc2l0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRQb3NpdGlvbjtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9pdGVtc0xlbmd0aDogbnVtYmVyO1xuXG4gICAgcHJpdmF0ZSBnZXQgaXRlbXNMZW5ndGgoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pdGVtc0xlbmd0aDtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNldCBpdGVtc0xlbmd0aCh2YWx1ZTogbnVtYmVyKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdGhpcy5faXRlbXNMZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuX2l0ZW1zTGVuZ3RoID0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLl9vbkl0ZW1zTGVuZ3RoQ2hhbmdlZCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXQgX3N0YXJ0T2Zmc2V0KCkge1xuICAgICAgICBpZiAodGhpcy5tYXJrZWRJdGVtKSB7XG4gICAgICAgICAgICBjb25zdCB7IGl0ZW1IZWlnaHQsIHBhbmVsSGVpZ2h0IH0gPSB0aGlzLl9wYW5lbFNlcnZpY2UuZGltZW5zaW9ucztcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHRoaXMubWFya2VkSXRlbS5pbmRleCAqIGl0ZW1IZWlnaHQ7XG4gICAgICAgICAgICByZXR1cm4gcGFuZWxIZWlnaHQgPiBvZmZzZXQgPyAwIDogb2Zmc2V0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIG5nT25Jbml0KCkge1xuICAgICAgICB0aGlzLl9zZWxlY3QgPSB0aGlzLl9kcm9wZG93bi5wYXJlbnRFbGVtZW50O1xuICAgICAgICB0aGlzLl92aXJ0dWFsUGFkZGluZyA9IHRoaXMucGFkZGluZ0VsZW1lbnRSZWYubmF0aXZlRWxlbWVudDtcbiAgICAgICAgdGhpcy5fc2Nyb2xsYWJsZVBhbmVsID0gdGhpcy5zY3JvbGxFbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQ7XG4gICAgICAgIHRoaXMuX2NvbnRlbnRQYW5lbCA9IHRoaXMuY29udGVudEVsZW1lbnRSZWYubmF0aXZlRWxlbWVudDtcbiAgICAgICAgdGhpcy5faGFuZGxlU2Nyb2xsKCk7XG4gICAgICAgIHRoaXMuX2hhbmRsZU91dHNpZGVDbGljaygpO1xuICAgICAgICB0aGlzLl9hcHBlbmREcm9wZG93bigpO1xuICAgICAgICB0aGlzLl9zZXR1cE1vdXNlZG93bkxpc3RlbmVyKCk7XG4gICAgfVxuXG4gICAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcykge1xuICAgICAgICBpZiAoY2hhbmdlcy5pdGVtcykge1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlID0gY2hhbmdlcy5pdGVtcztcbiAgICAgICAgICAgIHRoaXMuX29uSXRlbXNDaGFuZ2UoY2hhbmdlLmN1cnJlbnRWYWx1ZSwgY2hhbmdlLmZpcnN0Q2hhbmdlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5nT25EZXN0cm95KCkge1xuICAgICAgICB0aGlzLl9kZXN0cm95JC5uZXh0KCk7XG4gICAgICAgIHRoaXMuX2Rlc3Ryb3kkLmNvbXBsZXRlKCk7XG4gICAgICAgIHRoaXMuX2Rlc3Ryb3kkLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIGlmICh0aGlzLmFwcGVuZFRvKSB7XG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJlci5yZW1vdmVDaGlsZCh0aGlzLl9kcm9wZG93bi5wYXJlbnROb2RlLCB0aGlzLl9kcm9wZG93bik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzY3JvbGxUbyhvcHRpb246IE5nT3B0aW9uLCBzdGFydEZyb21PcHRpb24gPSBmYWxzZSkge1xuICAgICAgICBpZiAoIW9wdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLml0ZW1zLmluZGV4T2Yob3B0aW9uKTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCBpbmRleCA+PSB0aGlzLml0ZW1zTGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgc2Nyb2xsVG87XG4gICAgICAgIGlmICh0aGlzLnZpcnR1YWxTY3JvbGwpIHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1IZWlnaHQgPSB0aGlzLl9wYW5lbFNlcnZpY2UuZGltZW5zaW9ucy5pdGVtSGVpZ2h0O1xuICAgICAgICAgICAgc2Nyb2xsVG8gPSB0aGlzLl9wYW5lbFNlcnZpY2UuZ2V0U2Nyb2xsVG8oaW5kZXggKiBpdGVtSGVpZ2h0LCBpdGVtSGVpZ2h0LCB0aGlzLl9sYXN0U2Nyb2xsUG9zaXRpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgaXRlbTogSFRNTEVsZW1lbnQgPSB0aGlzLl9kcm9wZG93bi5xdWVyeVNlbGVjdG9yKGAjJHtvcHRpb24uaHRtbElkfWApO1xuICAgICAgICAgICAgY29uc3QgbGFzdFNjcm9sbCA9IHN0YXJ0RnJvbU9wdGlvbiA/IGl0ZW0ub2Zmc2V0VG9wIDogdGhpcy5fbGFzdFNjcm9sbFBvc2l0aW9uO1xuICAgICAgICAgICAgc2Nyb2xsVG8gPSB0aGlzLl9wYW5lbFNlcnZpY2UuZ2V0U2Nyb2xsVG8oaXRlbS5vZmZzZXRUb3AsIGl0ZW0uY2xpZW50SGVpZ2h0LCBsYXN0U2Nyb2xsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0RlZmluZWQoc2Nyb2xsVG8pKSB7XG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxhYmxlUGFuZWwuc2Nyb2xsVG9wID0gc2Nyb2xsVG87XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzY3JvbGxUb1RhZygpIHtcbiAgICAgICAgY29uc3QgcGFuZWwgPSB0aGlzLl9zY3JvbGxhYmxlUGFuZWw7XG4gICAgICAgIHBhbmVsLnNjcm9sbFRvcCA9IHBhbmVsLnNjcm9sbEhlaWdodCAtIHBhbmVsLmNsaWVudEhlaWdodDtcbiAgICB9XG5cbiAgICBhZGp1c3RQb3NpdGlvbigpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlWVBvc2l0aW9uKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlRHJvcGRvd25Qb3NpdGlvbigpIHtcbiAgICAgICAgdGhpcy5fY3VycmVudFBvc2l0aW9uID0gdGhpcy5fY2FsY3VsYXRlQ3VycmVudFBvc2l0aW9uKHRoaXMuX2Ryb3Bkb3duKTtcbiAgICAgICAgaWYgKENTU19QT1NJVElPTlMuaW5jbHVkZXModGhpcy5fY3VycmVudFBvc2l0aW9uKSkge1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlRHJvcGRvd25DbGFzcyh0aGlzLl9jdXJyZW50UG9zaXRpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlRHJvcGRvd25DbGFzcygnYm90dG9tJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5hcHBlbmRUbykge1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlWVBvc2l0aW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9kcm9wZG93bi5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3VwZGF0ZURyb3Bkb3duQ2xhc3MoY3VycmVudFBvc2l0aW9uOiBzdHJpbmcpIHtcbiAgICAgICAgQ1NTX1BPU0lUSU9OUy5mb3JFYWNoKChwb3NpdGlvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgUkVNT1ZFX0NTU19DTEFTUyA9IGBuZy1zZWxlY3QtJHtwb3NpdGlvbn1gO1xuICAgICAgICAgICAgdGhpcy5fcmVuZGVyZXIucmVtb3ZlQ2xhc3ModGhpcy5fZHJvcGRvd24sIFJFTU9WRV9DU1NfQ0xBU1MpO1xuICAgICAgICAgICAgdGhpcy5fcmVuZGVyZXIucmVtb3ZlQ2xhc3ModGhpcy5fc2VsZWN0LCBSRU1PVkVfQ1NTX0NMQVNTKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgQUREX0NTU19DTEFTUyA9IGBuZy1zZWxlY3QtJHtjdXJyZW50UG9zaXRpb259YDtcbiAgICAgICAgdGhpcy5fcmVuZGVyZXIuYWRkQ2xhc3ModGhpcy5fZHJvcGRvd24sIEFERF9DU1NfQ0xBU1MpO1xuICAgICAgICB0aGlzLl9yZW5kZXJlci5hZGRDbGFzcyh0aGlzLl9zZWxlY3QsIEFERF9DU1NfQ0xBU1MpO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2hhbmRsZVNjcm9sbCgpIHtcbiAgICAgICAgdGhpcy5fem9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XG4gICAgICAgICAgICBmcm9tRXZlbnQodGhpcy5zY3JvbGxFbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQsICdzY3JvbGwnKVxuICAgICAgICAgICAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLl9kZXN0cm95JCksIGF1ZGl0VGltZSgwLCBTQ1JPTExfU0NIRURVTEVSKSlcbiAgICAgICAgICAgICAgICAuc3Vic2NyaWJlKChlOiB7IHBhdGgsIGNvbXBvc2VkUGF0aCwgdGFyZ2V0IH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IGUucGF0aCB8fCAoZS5jb21wb3NlZFBhdGggJiYgZS5jb21wb3NlZFBhdGgoKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjcm9sbFRvcCA9ICFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwID8gZS50YXJnZXQuc2Nyb2xsVG9wIDogcGF0aFswXS5zY3JvbGxUb3BcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25Db250ZW50U2Nyb2xsZWQoc2Nyb2xsVG9wKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfaGFuZGxlT3V0c2lkZUNsaWNrKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2RvY3VtZW50KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl96b25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IHtcbiAgICAgICAgICAgIG1lcmdlKFxuICAgICAgICAgICAgICAgIGZyb21FdmVudCh0aGlzLl9kb2N1bWVudCwgJ3RvdWNoc3RhcnQnLCB7IGNhcHR1cmU6IHRydWUgfSksXG4gICAgICAgICAgICAgICAgZnJvbUV2ZW50KHRoaXMuX2RvY3VtZW50LCAnbW91c2Vkb3duJywgeyBjYXB0dXJlOiB0cnVlIH0pXG4gICAgICAgICAgICApLnBpcGUodGFrZVVudGlsKHRoaXMuX2Rlc3Ryb3kkKSlcbiAgICAgICAgICAgICAgICAuc3Vic2NyaWJlKCRldmVudCA9PiB0aGlzLl9jaGVja1RvQ2xvc2UoJGV2ZW50KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX2NoZWNrVG9DbG9zZSgkZXZlbnQ6IGFueSkge1xuICAgICAgICBpZiAodGhpcy5fc2VsZWN0LmNvbnRhaW5zKCRldmVudC50YXJnZXQpIHx8IHRoaXMuX2Ryb3Bkb3duLmNvbnRhaW5zKCRldmVudC50YXJnZXQpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwYXRoID0gJGV2ZW50LnBhdGggfHwgKCRldmVudC5jb21wb3NlZFBhdGggJiYgJGV2ZW50LmNvbXBvc2VkUGF0aCgpKTtcbiAgICAgICAgaWYgKCRldmVudC50YXJnZXQgJiYgJGV2ZW50LnRhcmdldC5zaGFkb3dSb290ICYmIHBhdGggJiYgcGF0aFswXSAmJiB0aGlzLl9zZWxlY3QuY29udGFpbnMocGF0aFswXSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3pvbmUucnVuKCgpID0+IHRoaXMub3V0c2lkZUNsaWNrLmVtaXQoKSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfb25JdGVtc0NoYW5nZShpdGVtczogTmdPcHRpb25bXSwgZmlyc3RDaGFuZ2U6IGJvb2xlYW4pIHtcbiAgICAgICAgdGhpcy5pdGVtcyA9IGl0ZW1zIHx8IFtdO1xuICAgICAgICB0aGlzLl9zY3JvbGxUb0VuZEZpcmVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaXRlbXNMZW5ndGggPSBpdGVtcy5sZW5ndGg7XG5cbiAgICAgICAgaWYgKHRoaXMudmlydHVhbFNjcm9sbCkge1xuICAgICAgICAgICAgdGhpcy5fdXBkYXRlSXRlbXNSYW5nZShmaXJzdENoYW5nZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zZXRWaXJ0dWFsSGVpZ2h0KCk7XG4gICAgICAgICAgICB0aGlzLl91cGRhdGVJdGVtcyhmaXJzdENoYW5nZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIF91cGRhdGVJdGVtcyhmaXJzdENoYW5nZTogYm9vbGVhbikge1xuICAgICAgICB0aGlzLnVwZGF0ZS5lbWl0KHRoaXMuaXRlbXMpO1xuICAgICAgICBpZiAoZmlyc3RDaGFuZ2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl96b25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IHtcbiAgICAgICAgICAgIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhbmVsSGVpZ2h0ID0gdGhpcy5fc2Nyb2xsYWJsZVBhbmVsLmNsaWVudEhlaWdodDtcbiAgICAgICAgICAgICAgICB0aGlzLl9wYW5lbFNlcnZpY2Uuc2V0RGltZW5zaW9ucygwLCBwYW5lbEhlaWdodCk7XG4gICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlRHJvcGRvd25Qb3NpdGlvbigpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsVG8odGhpcy5tYXJrZWRJdGVtLCBmaXJzdENoYW5nZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfdXBkYXRlSXRlbXNSYW5nZShmaXJzdENoYW5nZTogYm9vbGVhbikge1xuICAgICAgICB0aGlzLl96b25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX21lYXN1cmVEaW1lbnNpb25zKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGZpcnN0Q2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlckl0ZW1zUmFuZ2UodGhpcy5fc3RhcnRPZmZzZXQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVEcm9wZG93blBvc2l0aW9uKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVySXRlbXNSYW5nZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF9vbkNvbnRlbnRTY3JvbGxlZChzY3JvbGxUb3A6IG51bWJlcikge1xuICAgICAgICBpZiAodGhpcy52aXJ0dWFsU2Nyb2xsKSB7XG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJJdGVtc1JhbmdlKHNjcm9sbFRvcCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbGFzdFNjcm9sbFBvc2l0aW9uID0gc2Nyb2xsVG9wO1xuICAgICAgICB0aGlzLl9maXJlU2Nyb2xsVG9FbmQoc2Nyb2xsVG9wKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF91cGRhdGVWaXJ0dWFsSGVpZ2h0KGhlaWdodDogbnVtYmVyKSB7XG4gICAgICAgIGlmICh0aGlzLl91cGRhdGVTY3JvbGxIZWlnaHQpIHtcbiAgICAgICAgICAgIHRoaXMuX3ZpcnR1YWxQYWRkaW5nLnN0eWxlLmhlaWdodCA9IGAke2hlaWdodH1weGA7XG4gICAgICAgICAgICB0aGlzLl91cGRhdGVTY3JvbGxIZWlnaHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX3NldFZpcnR1YWxIZWlnaHQoKSB7XG5cbiAgICAgICAgaWYgKCF0aGlzLl92aXJ0dWFsUGFkZGluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fdmlydHVhbFBhZGRpbmcuc3R5bGUuaGVpZ2h0ID0gYDBweGA7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfb25JdGVtc0xlbmd0aENoYW5nZWQoKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZVNjcm9sbEhlaWdodCA9IHRydWU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfcmVuZGVySXRlbXNSYW5nZShzY3JvbGxUb3AgPSBudWxsKSB7XG4gICAgICAgIGlmIChzY3JvbGxUb3AgJiYgdGhpcy5fbGFzdFNjcm9sbFBvc2l0aW9uID09PSBzY3JvbGxUb3ApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHNjcm9sbFRvcCA9IHNjcm9sbFRvcCB8fCB0aGlzLl9zY3JvbGxhYmxlUGFuZWwuc2Nyb2xsVG9wO1xuICAgICAgICBjb25zdCByYW5nZSA9IHRoaXMuX3BhbmVsU2VydmljZS5jYWxjdWxhdGVJdGVtcyhzY3JvbGxUb3AsIHRoaXMuaXRlbXNMZW5ndGgsIHRoaXMuYnVmZmVyQW1vdW50KTtcbiAgICAgICAgdGhpcy5fdXBkYXRlVmlydHVhbEhlaWdodChyYW5nZS5zY3JvbGxIZWlnaHQpO1xuICAgICAgICB0aGlzLl9jb250ZW50UGFuZWwuc3R5bGUudHJhbnNmb3JtID0gYHRyYW5zbGF0ZVkoJHtyYW5nZS50b3BQYWRkaW5nfXB4KWA7XG5cbiAgICAgICAgdGhpcy5fem9uZS5ydW4oKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGUuZW1pdCh0aGlzLml0ZW1zLnNsaWNlKHJhbmdlLnN0YXJ0LCByYW5nZS5lbmQpKTtcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsLmVtaXQoeyBzdGFydDogcmFuZ2Uuc3RhcnQsIGVuZDogcmFuZ2UuZW5kIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoaXNEZWZpbmVkKHNjcm9sbFRvcCkgJiYgdGhpcy5fbGFzdFNjcm9sbFBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLl9zY3JvbGxhYmxlUGFuZWwuc2Nyb2xsVG9wID0gc2Nyb2xsVG9wO1xuICAgICAgICAgICAgdGhpcy5fbGFzdFNjcm9sbFBvc2l0aW9uID0gc2Nyb2xsVG9wO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfbWVhc3VyZURpbWVuc2lvbnMoKTogUHJvbWlzZTxQYW5lbERpbWVuc2lvbnM+IHtcbiAgICAgICAgaWYgKHRoaXMuX3BhbmVsU2VydmljZS5kaW1lbnNpb25zLml0ZW1IZWlnaHQgPiAwIHx8IHRoaXMuaXRlbXNMZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fcGFuZWxTZXJ2aWNlLmRpbWVuc2lvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgW2ZpcnN0XSA9IHRoaXMuaXRlbXM7XG4gICAgICAgIHRoaXMudXBkYXRlLmVtaXQoW2ZpcnN0XSk7XG5cbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9uID0gdGhpcy5fZHJvcGRvd24ucXVlcnlTZWxlY3RvcihgIyR7Zmlyc3QuaHRtbElkfWApO1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9uSGVpZ2h0ID0gb3B0aW9uLmNsaWVudEhlaWdodDtcbiAgICAgICAgICAgIHRoaXMuX3ZpcnR1YWxQYWRkaW5nLnN0eWxlLmhlaWdodCA9IGAke29wdGlvbkhlaWdodCAqIHRoaXMuaXRlbXNMZW5ndGh9cHhgO1xuICAgICAgICAgICAgY29uc3QgcGFuZWxIZWlnaHQgPSB0aGlzLl9zY3JvbGxhYmxlUGFuZWwuY2xpZW50SGVpZ2h0O1xuICAgICAgICAgICAgdGhpcy5fcGFuZWxTZXJ2aWNlLnNldERpbWVuc2lvbnMob3B0aW9uSGVpZ2h0LCBwYW5lbEhlaWdodCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYW5lbFNlcnZpY2UuZGltZW5zaW9ucztcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfZmlyZVNjcm9sbFRvRW5kKHNjcm9sbFRvcDogbnVtYmVyKSB7XG4gICAgICAgIGlmICh0aGlzLl9zY3JvbGxUb0VuZEZpcmVkIHx8IHNjcm9sbFRvcCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcGFkZGluZyA9IHRoaXMudmlydHVhbFNjcm9sbCA/XG4gICAgICAgICAgICB0aGlzLl92aXJ0dWFsUGFkZGluZyA6XG4gICAgICAgICAgICB0aGlzLl9jb250ZW50UGFuZWw7XG5cbiAgICAgICAgaWYgKHNjcm9sbFRvcCArIHRoaXMuX2Ryb3Bkb3duLmNsaWVudEhlaWdodCA+PSBwYWRkaW5nLmNsaWVudEhlaWdodCAtIDEpIHtcbiAgICAgICAgICAgIHRoaXMuX3pvbmUucnVuKCgpID0+IHRoaXMuc2Nyb2xsVG9FbmQuZW1pdCgpKTtcbiAgICAgICAgICAgIHRoaXMuX3Njcm9sbFRvRW5kRmlyZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfY2FsY3VsYXRlQ3VycmVudFBvc2l0aW9uKGRyb3Bkb3duRWw6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGlmICh0aGlzLnBvc2l0aW9uICE9PSAnYXV0bycpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBvc2l0aW9uO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNlbGVjdFJlY3Q6IENsaWVudFJlY3QgPSB0aGlzLl9zZWxlY3QuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIGNvbnN0IHNjcm9sbFRvcCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3AgfHwgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3A7XG4gICAgICAgIGNvbnN0IG9mZnNldFRvcCA9IHNlbGVjdFJlY3QudG9wICsgd2luZG93LnBhZ2VZT2Zmc2V0O1xuICAgICAgICBjb25zdCBoZWlnaHQgPSBzZWxlY3RSZWN0LmhlaWdodDtcbiAgICAgICAgY29uc3QgZHJvcGRvd25IZWlnaHQgPSBkcm9wZG93bkVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcbiAgICAgICAgaWYgKG9mZnNldFRvcCArIGhlaWdodCArIGRyb3Bkb3duSGVpZ2h0ID4gc2Nyb2xsVG9wICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCkge1xuICAgICAgICAgICAgcmV0dXJuICd0b3AnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICdib3R0b20nO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfYXBwZW5kRHJvcGRvd24oKSB7XG4gICAgICAgIGlmICghdGhpcy5hcHBlbmRUbykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcGFyZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0aGlzLmFwcGVuZFRvKTtcbiAgICAgICAgaWYgKCF0aGlzLl9wYXJlbnQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgYXBwZW5kVG8gc2VsZWN0b3IgJHt0aGlzLmFwcGVuZFRvfSBkaWQgbm90IGZvdW5kIGFueSBwYXJlbnQgZWxlbWVudGApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3VwZGF0ZVhQb3NpdGlvbigpO1xuICAgICAgICB0aGlzLl9wYXJlbnQuYXBwZW5kQ2hpbGQodGhpcy5fZHJvcGRvd24pO1xuICAgIH1cblxuICAgIHByaXZhdGUgX3VwZGF0ZVhQb3NpdGlvbigpIHtcbiAgICAgICAgY29uc3Qgc2VsZWN0ID0gdGhpcy5fc2VsZWN0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICBjb25zdCBwYXJlbnQgPSB0aGlzLl9wYXJlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIGNvbnN0IG9mZnNldExlZnQgPSBzZWxlY3QubGVmdCAtIHBhcmVudC5sZWZ0O1xuXG4gICAgICAgIHRoaXMuX2Ryb3Bkb3duLnN0eWxlLmxlZnQgPSBvZmZzZXRMZWZ0ICsgJ3B4JztcbiAgICAgICAgdGhpcy5fZHJvcGRvd24uc3R5bGUud2lkdGggPSBzZWxlY3Qud2lkdGggKyAncHgnO1xuICAgICAgICB0aGlzLl9kcm9wZG93bi5zdHlsZS5taW5XaWR0aCA9IHNlbGVjdC53aWR0aCArICdweCc7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfdXBkYXRlWVBvc2l0aW9uKCkge1xuICAgICAgICBjb25zdCBzZWxlY3QgPSB0aGlzLl9zZWxlY3QuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIGNvbnN0IHBhcmVudCA9IHRoaXMuX3BhcmVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgY29uc3QgZGVsdGEgPSBzZWxlY3QuaGVpZ2h0O1xuXG4gICAgICAgIGlmICh0aGlzLl9jdXJyZW50UG9zaXRpb24gPT09ICd0b3AnKSB7XG4gICAgICAgICAgICBjb25zdCBvZmZzZXRCb3R0b20gPSBwYXJlbnQuYm90dG9tIC0gc2VsZWN0LmJvdHRvbTtcbiAgICAgICAgICAgIHRoaXMuX2Ryb3Bkb3duLnN0eWxlLmJvdHRvbSA9IG9mZnNldEJvdHRvbSArIGRlbHRhICsgJ3B4JztcbiAgICAgICAgICAgIHRoaXMuX2Ryb3Bkb3duLnN0eWxlLnRvcCA9ICdhdXRvJztcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9jdXJyZW50UG9zaXRpb24gPT09ICdib3R0b20nKSB7XG4gICAgICAgICAgICBjb25zdCBvZmZzZXRUb3AgPSBzZWxlY3QudG9wIC0gcGFyZW50LnRvcDtcbiAgICAgICAgICAgIHRoaXMuX2Ryb3Bkb3duLnN0eWxlLnRvcCA9IG9mZnNldFRvcCArIGRlbHRhICsgJ3B4JztcbiAgICAgICAgICAgIHRoaXMuX2Ryb3Bkb3duLnN0eWxlLmJvdHRvbSA9ICdhdXRvJztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgX3NldHVwTW91c2Vkb3duTGlzdGVuZXIoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4ge1xuICAgICAgICAgICAgZnJvbUV2ZW50KHRoaXMuX2Ryb3Bkb3duLCAnbW91c2Vkb3duJylcbiAgICAgICAgICAgICAgICAucGlwZSh0YWtlVW50aWwodGhpcy5fZGVzdHJveSQpKVxuICAgICAgICAgICAgICAgIC5zdWJzY3JpYmUoKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2ZW50LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldC50YWdOYW1lID09PSAnSU5QVVQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuIl19