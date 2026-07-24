# Contributing to Bento Guard SDK

First off, thank you for considering contributing to the Bento Guard SDK! It's people like you that make Bento a secure and reliable layer for AI Agents on Solana.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for the Bento Guard SDK. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

- Check the [Issues](https://github.com/bento-guard/bento-sdk/issues) to see if someone else has already reported the problem.
- Use the **Bug Report** issue template to ensure we have all the details needed to reproduce the issue.
- Please include your SDK version, environment details, and clear steps to reproduce the bug.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.

- Check the [Issues](https://github.com/bento-guard/bento-sdk/issues) to see if someone else has already suggested it.
- Use the **Feature / Improvement** issue template.
- Provide a clear use case for your enhancement and why it is beneficial for the broader Bento Guard ecosystem.

### Pull Requests

The process described here has several goals:
- Maintain Bento's security and code quality.
- Fix problems that are important to users.
- Engage the community in working toward the best possible SDK.

Please follow these steps to have your contribution considered by the maintainers:
1. **Fork** the repository and create a new branch (`git checkout -b feat/my-new-feature`).
2. Make sure your changes are tested (`npm run test`) and properly formatted (`npm run format`).
3. Commit your changes using a descriptive commit message. If you are fixing an issue, reference it in your commit message.
4. Push your branch to GitHub (`git push origin feat/my-new-feature`).
5. Open a **Pull Request** and describe your changes in detail.

## Development Setup

To set up the project locally:

1. Clone the repository.
2. Run `npm install` to install all dependencies.
3. Use `npm run dev` to watch for TypeScript changes or `npm run build` to compile the project.
4. Ensure all tests pass by running `npm run test`.

## Styleguides

### Git Commit Messages
- Use the present tense ("Add feature" not "Added feature").
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...").
- Limit the first line to 72 characters or less.
- Reference issues and pull requests liberally after the first line.

### Code Guidelines
- Please run `npm run format` (Prettier) before committing your code.
- Ensure your code passes the linting step (`npm run lint`).
- Include JSDoc comments for any public SDK methods or interfaces.

Thank you for contributing to a safer Web3!
