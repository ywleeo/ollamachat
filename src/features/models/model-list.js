// src/features/models/model-list.js
import $ from "../../utils/dom.js";
import store from "../../state/store.js";
import { selectModel } from "../../state/actions.js";

class ModelList {
    constructor(container) {
        this.container = container || $("#model-list-container");

        // Add a click handler to the container for event delegation
        this.container.on("click", this.handleContainerClick.bind(this));

        // Subscribe to state changes
        store.subscribe((state) => {
            this.render(state);
        });
    }

    handleContainerClick(event) {
        // Check if a button was clicked
        if (event.target.classList.contains("model-button")) {
            // Skip if the button is disabled or has model-selected class
            if (
                event.target.classList.contains("disabled") ||
                event.target.classList.contains("model-selected")
            ) {
                return;
            }

            const modelName = $(event.target).attr("data-model");
            if (modelName) {
                const state = store.getState();
                const currentStatus =
                    state.modelStatus && state.modelStatus[modelName]
                        ? state.modelStatus[modelName]
                        : "available";

                // Only trigger if not already loading or closing
                if (
                    currentStatus !== "loading" &&
                    currentStatus !== "closing"
                ) {
                    selectModel(modelName);
                }
            }
        }
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
            let isDisabled = false;

            // Set appropriate status class and check if button should be disabled
            if (currentStatus === "loading") {
                statusClass = "status-loading";
                buttonText = `Loading ${model.name}...`;
                isDisabled = true;
            } else if (currentStatus === "closing") {
                statusClass = "status-loading";
                buttonText = `Closing ${model.name}...`;
                isDisabled = true;
            } else if (currentStatus === "error") {
                statusClass = "status-error";
            } else if (isLoaded) {
                statusClass = "status-loaded";
                // Disable if already loaded and selected
                isDisabled = isSelected;
            }

            // Always add model-selected class if this is the selected model
            const buttonClass = `model-button ${
                isSelected ? "model-selected" : ""
            } ${statusClass} ${isDisabled ? "disabled" : ""}`;

            // Create the button element with data attribute
            const button = $.create("button", {
                attributes: {
                    class: buttonClass,
                    "data-model": model.name
                }
            }).text(buttonText);

            // Append to container
            this.container.appendChild(button);
        });
    }

    renderStatus(message, statusClass) {
        const statusElement = $.create("div", {
            attributes: { class: `status-indicator ${statusClass}` }
        }).text(message);

        this.container.empty();
        this.container.appendChild(statusElement);
    }
}

export default ModelList;