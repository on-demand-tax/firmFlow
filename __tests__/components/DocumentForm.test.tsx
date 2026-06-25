import { render, screen } from '@testing-library/react';

import { DocumentForm } from '@/components/app/DocumentForm';

describe('DocumentForm', () => {
  it('renders link fields for link entry type', () => {
    render(
      <DocumentForm
        mode="create"
        entryType="Link"
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByLabelText('제목')).toBeInTheDocument();
    expect(screen.getByLabelText('링크 URL')).toBeInTheDocument();
    expect(screen.queryByLabelText('파일')).not.toBeInTheDocument();
  });

  it('renders file input when showFileInput is true', () => {
    render(
      <DocumentForm
        mode="create"
        entryType="File"
        showFileInput
        onSubmit={async () => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByLabelText('파일')).toBeInTheDocument();
  });
});
