export class Topic {
    constructor({ slug, title, description, shouldDisplay, isCategory, order }) {
        this.slug = slug;
        this.title = title;
        this.description = description;
        this.shouldDisplay = shouldDisplay;
        this.isCategory = isCategory;
        this.order = order;
    }
}