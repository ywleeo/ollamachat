// src/features/models/model-list.js
import $ from "../../utils/dom.js";
import store from "../../state/store.js";
import { selectModel } from "../../state/actions.js";
import { loadModel, closeModel } from "../../api/models.js";

class ModelList {
    constructor(container) {
        this.container = container || $("#model-list-container");

        // Subscribe to state changes
        store.subscribe((state) => {
            this.render(state);
        });
    }

    render(state) {
        const { models, selectedModel, loadedModel, modelStatus } = state;

        // Clear previous content
        this.container.empty();

        if (!models || models.length === 0) {
            this.renderStatus("No models available", "status-error");
            return;
        }

        // Render each model as a button
        models.forEach((model) => {
            const isSelected = model.name === selectedModel;
            const isLoaded = model.name === loadedModel;
            const currentStatus =
                modelStatus && modelStatus[model.name]
                    ? modelStatus[model.name]
                    : "available";

            let statusClass = "status-available";
            let buttonText = model.name;

            if (currentStatus === "loading") {
                statusClass = "status-loading";
                buttonText = `Loading ${model.name}...`;
            } else if (currentStatus === "closing") {
                statusClass = "status-loading";
                buttonText = `Closing ${model.name}...`;
            } else if (currentStatus === "error") {
                statusClass = "status-error";
            } else if (isLoaded) {
                statusClass = "status-loaded";
            }

            // Always add model-selected class if this is the selected model
            const buttonClass = `model-button ${
                isSelected ? "model-selected" : ""
            } ${statusClass}`;

            const button = $.create("button", {
                attributes: { class: buttonClass },
            });
            button.text(buttonText);
            // Setup click handler with debug logging
            button.on("click", (event) => {
                if (
                    currentStatus !== "loading" &&
                    currentStatus !== "closing"
                ) {
                    selectModel(model.name);
                }
            });

            this.container.appendChild(button);
        });
    }

    renderStatus(message, statusClass) {
        const statusElement = $.create("div", {
            attributes: { class: `status-indicator ${statusClass}` },
        }).text(message);

        this.container.empty().appendChild(statusElement);
    }
}

export default ModelList;
