import {Component, ElementRef, Input, SimpleChange} from '@angular/core';
import {IVisualization, ISample, IParamUpdate, ISkqw} from '../../../common/models';
import {defaultVis} from './defaultVisualization';

export interface IDimensions {
    width: number;
    height: number;
}

@Component({
    selector: 'visualizer',
    template: ``,
    styleUrls: ['./visualizer.scss']
})
export class Visualizer {

    @Input() sample: ISample;
    @Input() visualization: IVisualization;
    private skqw: ISkqw;
    private canvases: HTMLCanvasElement[] = [];
    private dimensions: IDimensions = { width: 0, height: 0 };
    private resizeTimer: any;
    private isRunning: boolean = false;
    private onResizeFn: Function;
    private rafId: any;

    private tick = (timestamp) => {
        if (this.isRunning && this.visualization.tick) {
            try {
                this.visualization.tick(this.skqw, timestamp);
            } catch (e) {
                console.log(e);
            }
            this.rafId = requestAnimationFrame(this.tick);
        }
    };

    constructor(private elementRef: ElementRef) {
        const self = this;
        this.skqw = {
            createCanvas: this.createCanvas.bind(this),
            get sample(): ISample { return self.sample },
            get dimensions(): IDimensions { return self.dimensions }
        };
    }

    ngOnInit(): void {
        window.addEventListener('resize', this.resizeHandler.bind(this));
    }

    ngOnChanges(changes: {[key: string]: SimpleChange}): void {
        if (changes['visualization']) {
            this.stop(changes['visualization'].previousValue);
            this.updateDimensions();
            if (this.visualization && this.visualization.init) {
                try {
                    this.visualization.init(this.skqw);
                } catch (e) {
                    console.log(e);
                }
                this.start();
            } else {
                this.visualization = defaultVis;
                this.visualization.init(this.skqw);
                this.start();
            }
        }
    }

    start() {
        this.isRunning = true;
        this.rafId = requestAnimationFrame(this.tick);
    }

    stop(visualization?: IVisualization) {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        if (visualization && typeof visualization.destroy === 'function') {
            try {
                visualization.destroy(this.skqw);
            } catch (e) {
                console.log(e);
            }
        }
        this.isRunning = false;
        this.removeCanvases();
        this.onResizeFn = null;
    }

    updateParam(paramUpdate: IParamUpdate): void {
        if (this.visualization && typeof this.visualization.paramChange === 'function') {
            try {
                this.visualization.paramChange(this.skqw, paramUpdate);
            } catch (e) {
                console.log(e);
            }
        }
    }

    /**
     * Creates a canvas element for the visualization to render onto.
     */
    createCanvas(userSuppliedCanvas?: HTMLCanvasElement): HTMLCanvasElement {
        let canvas = userSuppliedCanvas || document.createElement('canvas');
        let container = this.elementRef.nativeElement;
        this.elementRef.nativeElement.appendChild(canvas);
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        this.canvases.push(canvas);
        return canvas;
    }

    /**
     * Debounce the resize handler since the resize even gets fired rapidly in
     * succession as the user resizes.
     */
    resizeHandler() {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            this.updateDimensions();
            if (this.visualization && typeof this.visualization.resize === 'function') {
                try {
                    this.visualization.resize(this.skqw);
                } catch (e) {
                    console.log(e);
                }
            }
        }, 100);
    }

    /**
     * Update the w & h dimensions and set the canvas dimensions.
     */
    updateDimensions() {
        this.dimensions.width = this.elementRef.nativeElement.offsetWidth;
        this.dimensions.height = this.elementRef.nativeElement.offsetHeight;

        this.canvases.forEach((c: HTMLCanvasElement) => {
            c.width = this.dimensions.width;
            c.height = this.dimensions.height;
        });
    }

    /**
     * Remove any existing canvases from the DOM.
     */
    removeCanvases() {
        this.canvases.forEach(c => {
            if (c.parentNode) {
                c.parentNode.removeChild(c);
            }
        });
        this.canvases = [];
    }
}
