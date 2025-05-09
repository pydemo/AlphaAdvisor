# AlphaAdvisor: AI-Powered Camera Settings Assistant

A comprehensive solution to make Sony A7R V camera configuration accessible through AI-powered guidance.

## Project Goal

This project is part of the Devpost.com hackathon and aims to create an intelligent assistant that helps photographers optimize their Sony A7R V camera settings through natural language interaction.

Documentation is step one, which we are doing manually by capturing the entire menu hierarchy from the camera in structured JSON format. With this foundation in place, our next steps include:

1. Creating educational resources for camera users
2. Researching camera configuration options for creative use
3. Enabling users to create complex presets which they can use as guides to manually mirror them in camera
4. **Using LLMs (Large Language Models) to generate personalized camera preset plans** - providing users with step-by-step menu navigation instructions tailored to their specific photography needs

## How We Parse the Complete Tree of Sony Camera Menus into JSON

Our approach to documenting the Sony A7R V menu system involves several steps:

1. **Menu Structure Mapping**: We start by capturing the top-level menu categories (tabs) with their names, colors, and icons.

2. **Page Identification**: Within each menu tab, we identify and document individual pages and their settings.

3. **Setting Documentation**: For each setting, we record:
   - The name of the setting
   - Available options/values
   - Detailed descriptions of the setting's purpose
   - Default values where applicable

4. **Hierarchical Organization**: We maintain the hierarchical structure of the menu system with nested JSON objects that accurately represent submenus and their relationships.

5. **Visual Reference**: We include references to screenshots of menu pages to validate the structure and content.

6. **Comprehensive Coverage**: We ensure that every menu item in the camera is documented, including hidden or conditional settings.

The resulting JSON structure follows this pattern:
```json
{
  "camera": "Sony A7R V",
  "menu_structure": [
    {
      "tab_name": "Tab Name",
      "tab_color": "Color",
      "tab_icon": "ICON",
      "pages": [
        {
          "page_name": "Page Name",
          "settings": [
            {
              "name": "Setting Name",
              "options": ["Option 1", "Option 2", "..."],
              "description": "Detailed description of the setting"
            },
            // More settings...
          ]
        },
        // More pages...
      ]
    },
    // More tabs...
  ]
}
```

## Repository Structure

- `sony_a7rv_menu.json`: Main JSON file containing the complete menu structure
- `MENU/`: Directory containing individual JSON files for each menu section
  - `menu_main.json`, `menu_shooting.json`, etc.: JSON files for each menu tab
  - Subdirectories for each page containing individual setting JSON files

## Future Applications

With this structured documentation in place, we plan to:

1. Build visualization tools to help users navigate the complex menu system
2. Develop preset generators for specific photography styles (portrait, landscape, astrophotography, etc.)
3. Create comparison tools to understand differences between camera settings
4. Enable photographers to share optimal configurations for specific shooting scenarios
5. **Leverage LLMs to generate customized camera setup guides** - Users will be able to describe their photography goals in natural language, and our system will generate detailed, personalized menu navigation instructions to achieve optimal camera settings

## LLM-Powered Camera Setup Assistant

A key innovation of this project is using LLMs to create a camera setup assistant that:

1. Understands natural language descriptions of photography goals (e.g., "I want to shoot fast-moving sports in low light conditions")
2. Analyzes the complete menu structure to determine optimal settings combinations
3. Generates a detailed, ordered list of menu items for the user to change on their camera
4. Provides explanations for why specific settings are recommended
5. Adapts recommendations based on user feedback and preferences

This approach bridges the gap between complex camera capabilities and user-friendly guidance, making advanced photography techniques more accessible to users at all skill levels.

## Contributing

Contributions to improve accuracy, add missing menu items, or enhance descriptions are welcome. Please submit pull requests with any corrections or additions.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
