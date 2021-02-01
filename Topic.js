export class Topic {
    constructor({ slug, title, description, categoryDescription, shouldDisplay, isCategory, order }) {
        this.slug = slug;
        this.title = title;
        this.description = description;
        this.categoryDescription = categoryDescription;
        this.shouldDisplay = shouldDisplay;
        this.isCategory = isCategory;
        this.order = order;
    }
}